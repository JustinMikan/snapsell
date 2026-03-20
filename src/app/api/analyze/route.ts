import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `你是 SnapSell 二手商品辨識助手，專門從商品照片中精確辨識商品身份。

## 最高原則
「精確」比「安全」重要。寧可回報一個具體的型號名稱，也不要回報「按摩椅」「筆電」這種泛稱。
如果標籤上寫「日光4D智能帝王椅 NI-8700」，就用這個全名，絕對不要簡化成「按摩椅」。

## 分析流程（嚴格遵守順序）
1. 先掃描所有照片，找出包含文字資訊的照片（標籤、銘牌、規格貼紙、包裝盒文字、保固卡）
2. 從文字照片中提取：品牌名稱、產品名稱、型號編號、製造日期、主要規格
3. 用其他照片確認商品外觀、成色、配件狀況
4. 綜合所有資訊填寫欄位

## 文字辨識重點
- 仔細閱讀照片中的所有中文、英文、數字
- 型號通常是英文+數字的組合（如 NI-8700、A2442、RT-AX88U、iPhone 15 Pro）
- 品牌名稱可能是中文或英文，標籤上的寫法永遠優先於你的猜測
- 製造日期標示如「107年」= 民國107年 = 2018年，務必記入備註
- 如果看到規格資訊（瓦數、電壓、尺寸等），也記入備註

## 辨識信心階層（由高到低）
1. 標籤/銘牌/規格貼紙上的文字 → 最高信心，直接採用
2. 品牌 Logo + 可見文字標記 → 高信心
3. 外觀特徵視覺辨識 → 中等信心
4. 泛類推測 → 最低信心，僅在完全無任何線索時才使用

## 回傳欄位說明
1. category: 從以下選一個最適合的：3C、家電、傢俱、衣物、精品、鞋子、嬰幼兒、露營、綜合、其他
2. name: 商品完整名稱，格式為「品牌 + 產品名 + 型號」（例：「日光 4D 智能帝王椅 NI-8700」、「Apple MacBook Air M2」）
3. brand: 品牌名稱（從標籤或 logo 辨識，不要輕易填「其他」或「未知」）
4. condition: 從以下判斷：全新、近全新、八成新、有明顯使用痕跡
5. suggestedPrice: 粗略估價（台幣整數），後續會由專門的查價系統做精確市場定價
6. notes: 陣列，5-8 條從照片中觀察到的重要細節，包含：
   - 從標籤讀到的規格資訊（型號、製造年份、產地、功率等）
   - 成色描述（皮革狀況、螢幕狀況、外殼磨損等）
   - 配件狀況（遙控器、充電器、說明書等）
   - 特色功能
   - 原價參考（如果能從型號推斷）

回傳嚴格 JSON 格式，不要加 markdown 或其他文字：
{
  "category": "...",
  "name": "...",
  "brand": "...",
  "condition": "...",
  "suggestedPrice": 0,
  "notes": ["...", "..."]
}`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'API key not configured. Set ANTHROPIC_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Support both { photos: [...] } and legacy { photo: "..." }
    let photoArray: string[];
    if (Array.isArray(body.photos)) {
      photoArray = body.photos;
    } else if (typeof body.photo === 'string') {
      photoArray = [body.photo];
    } else {
      return Response.json({ error: 'No photos provided' }, { status: 400 });
    }

    if (photoArray.length === 0) {
      return Response.json({ error: 'No photos provided' }, { status: 400 });
    }

    // Build multi-image content blocks
    const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    for (const photo of photoArray) {
      const base64Match = photo.match(/^data:image\/(.*?);base64,(.*)$/);
      if (!base64Match) continue;

      const rawType = base64Match[1];
      const mediaType = rawType === 'jpg' ? 'image/jpeg' : `image/${rawType}`;
      const base64Data = base64Match[2];

      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64Data,
        },
      });
    }

    // Add text instruction after all images
    contentBlocks.push({
      type: 'text',
      text: `以上是商品的 ${photoArray.length} 張照片。請仔細檢查每一張照片，特別注意標籤、銘牌、規格貼紙上的文字資訊。回傳 JSON 格式的商品辨識結果。`,
    });

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: contentBlocks,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonStr = textBlock.text.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Invalid JSON response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err: unknown) {
    console.error('Analyze API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
