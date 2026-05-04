import { requireUser } from '../auth';
import { getGenerativeModel } from '../generativeai';

export async function handleChatCoach(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    // Use a specific fast model for the coach to ensure minimal latency
    // instead of relying on the global environment variable which might be set to a heavier model.
    const genAI = getGenerativeModel('default');
    const model = (genAI as any).apiKey ? 
      new (await import('@google/generative-ai')).GoogleGenerativeAI((genAI as any).apiKey).getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' }) : 
      getGenerativeModel('default'); // Fallback

    const systemPrompt = `너는 사용자의 생각, 감정, 아이디어, 메모를 정리하도록 돕는 'Momentum' 이라는 이름의 다정한 코치야.
절대 길게 답변하지 마. (최대 1~2문장)
먼저 결론을 내리거나 가르치려 하지 마.
사용자 말의 의도를 먼저 파악해.
만약 감정적인 호소라면 깊이 공감하고 위로하며 그 감정의 뿌리를 묻고, 
만약 사실의 기록이나 아이디어 나열이라면 논리를 확장하거나 구체화할 수 있는 날카로운 질문을 던져.
대화체로 편안하게 존댓말을 사용해.`;

    // Convert messages to Gemini format. Limit context to the last 10 messages to avoid context bloat.
    const recentMessages = messages.slice(-10);
    const contents = recentMessages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const result = await model.generateContent({
      contents,
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      generationConfig: {
        thinkingConfig: {
          thinkingLevel: "minimal"
        },
        maxOutputTokens: 256,
        temperature: 0.7,
      } as any
    });

    const responseText = result.response.text();

    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.error('Coach AI Error:', error);
    return res.status(500).json({ error: 'Failed to generate coaching response' });
  }
}

export async function handleSummarizeConversation(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const model = getGenerativeModel('default');
    
    const prompt = `다음은 사용자와 AI 코치의 대화 기록입니다.
이 대화 내용 중 **"사용자가 한 말(User)"** 에만 집중하세요. AI 코치의 질문이나 유도 멘트는 완전히 배제하십시오.
대화의 맥락을 파악하여, 대화가 감정에 관한 것이라면 사용자의 깨달음이나 감정 변화를 요약하고, 사실이나 아이디어에 관한 것이라면 주요 팩트와 논리를 요약하세요.
오직 사용자가 이야기한 내용만을 바탕으로 1인칭 시점의 에세이/일기/기록 형식으로 3~4문장으로 요약하세요.
결과는 반드시 아래 JSON 형식으로만 반환하세요. 마크다운 기호 없이 순수 JSON만 반환하세요.
{
  "title": "[대화를 대표하는 핵심 제목 (최대 6단어)]",
  "summary": "[오직 사용자의 생각만 요약된 글]"
}

대화 기록:
${text}
`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // Remove formatting if any
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(responseText);

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Summarize Conversation Error:', error);
    return res.status(500).json({ error: 'Failed to summarize conversation' });
  }
}

