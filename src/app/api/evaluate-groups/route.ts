import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `你是 SnapSell 社團活躍度評估助手。你的任務是搜尋 Facebook 二手買賣社團的近期活躍程度，幫助賣家找到最容易成交的社團。

## 評估方式
對每個社團，搜尋「[社團名稱] facebook」或「[社團名稱] 買賣」，根據搜尋結果判斷：
1. 該社團是否仍然活躍（有近期貼文、互動）
2. 是否有成交相關跡象（已售出回報、留言詢問等）
3. 社團的口碑或評價

## 評分標準（1-5 分）
- 5 分：非常活躍，大量近期貼文，頻繁成交回報
- 4 分：活躍，定期有新貼文和互動
- 3 分：普通，有貼文但不算頻繁
- 2 分：不太活躍，貼文較少或互動低
- 1 分：幾乎沒有活動跡象

## 回傳格式（嚴格 JSON，不要 markdown）
{
  "evaluations": [
    {
      "groupId": "社團 ID",
      "activityScore": 數字(1-5),
      "reason": "一句話說明評分依據"
    }
  ]
}

注意：
- 如果搜尋結果不足以判斷，給 3 分（中性）並說明
- 每個社團都必須給分，不能跳過
- reason 要簡短有用，讓賣家能快速判斷`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const { groups } = await request.json();
    if (!Array.isArray(groups) || groups.length === 0) {
      return Response.json({ error: 'No groups provided' }, { status: 400 });
    }

    const groupList = groups
      .map((g: { id: string; name: string; members: number; membersDisplay: string }) =>
        `- ID: ${g.id} / 名稱: ${g.name} / 成員數: ${g.membersDisplay}`
      )
      .join('\n');

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
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
          content: `請評估以下 Facebook 社團的活躍度，搜尋每個社團的近期狀況：\n\n${groupList}\n\n請回傳 JSON 格式的評估結果。`,
        },
      ],
    });

    let jsonText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        jsonText += block.text;
      }
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'No JSON in response' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err: unknown) {
    console.error('Evaluate groups API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
