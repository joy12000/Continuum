import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../shared-lib/auth.js';
import { uploadTextToFileSearchStore, generateFileSearchSummary, getFileSearchStoreName } from '../shared-lib/fileSearch.js';

export async function handleChatBundleSync(req: VercelRequest, res: VercelResponse) {
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

    const ragPrompt = `새로운 노트 내용:\n${body}\n\n위 내용을 사용자의 기존 노트와 연결해 3-5문장으로 통찰을 요약하세요. 반드시 한국어로 작성하고, 과거 노트를 참조하면 해당 문장을 명시하세요.`;
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
