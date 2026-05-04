// Removed VercelRequest/VercelResponse import for Next.js compatibility

import { requireUser } from '../auth';
import { uploadTextToFileSearchStore, generateFileSearchSummary, getFileSearchStoreName } from '../fileSearch';

export async function handleChatBundleSync(req: any, res: any) {
  const auth = await requireUser(req, res);
  if (!auth) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { noteId, body, createdAt } = req.body || {};
  if (!noteId || typeof noteId !== 'string') {
    return res.status(400).json({ error: 'noteId is required.' });
  }
  if (!body || typeof body !== 'string') {
    return res.status(400).json({ error: 'body is required.' });
  }

  try {
    const storeName = getFileSearchStoreName();
    const created = createdAt ? new Date(createdAt) : new Date();
    const displayName = `note-${created.toISOString().slice(0, 10)}-${noteId.slice(0, 8)}`;

    const filePayload = [
      `note_id: ${noteId}`,
      `user_id: ${auth.userId}`,
      `created_at: ${created.toISOString()}`,
      '',
      body,
    ].join('\n');

    const uploadResult = await uploadTextToFileSearchStore({
      text: filePayload,
      displayName,
      storeName,
      metadata: [
        { key: 'user_id', value: auth.userId },
        { key: 'note_id', value: noteId },
        { key: 'created_at_ms', value: created.getTime() },
      ],
    });

    const ragPrompt = `다음은 새로 저장된 메모 내용입니다:\n${body}\n\n위 내용과 관련된 기존 메모들을 찾아 3-5문장으로 간결하게 연결 고리를 요약해주세요. 공통된 주제나 흐름이 있다면 강조하고, 새로운 메모가 기존 기록과 어떻게 연결되는지 설명해주세요.`;
    const ragResult = await generateFileSearchSummary({
      prompt: ragPrompt,
      userId: auth.userId,
      storeName,
    });

    return res.status(200).json({
      summary: ragResult.summary,
      storeName,
      fileMetadata: uploadResult?.response ?? uploadResult,
      groundingMetadata: ragResult.groundingMetadata,
    });
  } catch (e: any) {
    console.error('handleChatBundleSync failed:', e);
    return res.status(500).json({ error: e?.message || 'Failed to sync bundle.' });
  }
}
