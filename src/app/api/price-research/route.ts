import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `你是 SnapSell 定價研究助手。請根據商品資訊搜尋市場價格，嚴格遵循以下流程：

## 查價流程
1. 先搜尋新品零售價：搜尋「[品牌] [商品名] 售價 OR 定價 OR 價格」
2. 搜尋蝦皮二手：搜尋「[品牌] [商品名] 二手 蝦皮」
3. 搜尋 FB 社團行情：搜尋「[品牌] [商品名] 二手 FB 社團」
4. 備用搜尋：搜尋「[品牌] [商品名] 二手 OR 中古 價格」

## 重要：年份與折舊
- 如果使用者提供了製造年份或購買年份，這是非常重要的定價依據
- 電子產品、家電每年折舊約 10-15%
- 傢俱、按摩椅等大型物件每年折舊約 8-12%
- 搜尋時請加入年份關鍵字，例如「2018年 日光按摩椅 二手」

## 重要：搜尋目標平台
- 我們的目標是在 FB 社團販售，所以 FB 社團/蝦皮的成交價最有參考價值
- Yahoo 拍賣和露天拍賣的價格通常偏高（是開價不是成交價），請特別註明
- 盡量找「已售出」或「成交價」而非「上架開價」

## 定價邏輯
- 如果找到 FB/蝦皮的二手成交價：以這些價格的中位數為主要參考
- 如果只找到拍賣平台開價：打 7-8 折作為 FB 社團合理價
- 如果只找到新品價格：根據成色和年份打折
  - 全新：新品價 × 70%
  - 近全新：新品價 × 60%
  - 八成新：新品價 × 50%
  - 有明顯使用痕跡：新品價 × 35%
  - 每多一年再額外折 5-10%
- 如果完全查不到：誠實回報

## AI 估價交叉驗證
- 使用者會提供 AI 的初步估價金額
- 如果你的查價結果跟 AI 估價差距超過 2 倍，請在 reasoning 中特別解釋差異原因
- AI 估價基於訓練資料中的二手市場經驗，有時反而比網路搜尋更貼近 FB 社團的實際行情

## 回傳格式（嚴格 JSON，不要 markdown）
{
  "newPrice": 數字或null,
  "sources": [
    {"title": "來源名稱", "url": "https://...", "price": 數字, "type": "new或secondhand"}
  ],
  "suggestedPrice": 數字,
  "priceRangeLow": 數字,
  "priceRangeHigh": 數字,
  "reasoning": "一段中文說明，解釋你是如何得出這個建議價格的（包含參考了哪些來源、為什麼選這個價位）"
}

重要：
- sources 至少要有 1-3 個（盡量找齊）
- reasoning 要讓賣家理解你的定價邏輯
- 所有價格用台幣整數
- 如果真的找不到參考價，reasoning 要說明並建議開放議價`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const { name, brand, condition, notes, aiEstimate } = await request.json();
    if (!name || !brand) {
      return Response.json({ error: 'Missing name or brand' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    // Build user message with all available info
    let userMessage = `請幫我查價：\n品名：${name}\n品牌：${brand}\n成色：${condition || '八成新'}`;

    if (notes && Array.isArray(notes) && notes.length > 0) {
      userMessage += `\n\n商品額外資訊（AI 從照片辨識出的，可能包含型號、製造年份等重要定價依據）：\n${notes.map((n: string) => `- ${n}`).join('\n')}`;
    }

    if (aiEstimate && Number(aiEstimate) > 0) {
      userMessage += `\n\nAI 初步估價：$${Number(aiEstimate).toLocaleString()}（基於訓練資料中的二手市場經驗）`;
    }

    userMessage += '\n\n請搜尋新品價格和二手市場行情，然後回傳 JSON 格式的定價建議。';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305' as const,
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text blocks from response (may include web_search_result blocks)
    let jsonText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        jsonText += block.text;
      }
    }

    // Try to parse JSON from the text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'No JSON in response' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize the response
    const result = {
      newPrice: parsed.newPrice ?? null,
      secondhandPrices: Array.isArray(parsed.sources)
        ? parsed.sources.map((s: { title?: string; url?: string; price?: number; type?: string }) => ({
            title: s.title || '未知來源',
            url: s.url || '',
            price: Number(s.price) || 0,
            type: s.type === 'new' ? 'new' : 'secondhand',
          }))
        : [],
      suggestedPrice: Number(parsed.suggestedPrice) || 0,
      priceRangeLow: Number(parsed.priceRangeLow) || 0,
      priceRangeHigh: Number(parsed.priceRangeHigh) || 0,
      reasoning: parsed.reasoning || '無法取得定價建議',
    };

    return Response.json(result);
  } catch (err: unknown) {
    console.error('Price research API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
