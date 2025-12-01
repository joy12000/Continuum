const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} must be configured to use Gemini File Search.`);
  }
  return value;
}

const GEMINI_API_KEY = () => requireEnv('GEMINI_API_KEY');
const DEFAULT_STORE_NAME = () => requireEnv('GEMINI_FILE_SEARCH_STORE');
const NAMESPACE_STRATEGY = () => process.env.GEMINI_FILE_SEARCH_NAMESPACE_STRATEGY || 'metadata';
const DEFAULT_MODEL = () => process.env.GEMINI_FILE_SEARCH_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

type FileSearchResult = {
  noteId: string | null;
  content: string;
  score?: number | null;
  uri?: string;
  fileName?: string;
  chunkId?: string;
};

type MetadataEntry = { key: string; value: string | number };

function asMetadataPayload(entries: MetadataEntry[] = []) {
  return entries.map((entry) => {
    if (typeof entry.value === 'number') {
      return { key: entry.key, numeric_value: entry.value };
    }
    return { key: entry.key, string_value: entry.value };
  });
}

async function pollOperation(operationName: string): Promise<any> {
  const apiKey = GEMINI_API_KEY();
  const url = `${API_BASE}/${operationName}?key=${apiKey}`;
  let attempt = 0;
  while (true) {
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Failed to poll operation ${operationName}: ${text}`);
    }
    const data = await resp.json();
    if (data.done) {
      return data;
    }
    attempt += 1;
    const delay = Math.min(5000 * attempt, 15000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

interface UploadOptions {
  text: string;
  displayName: string;
  metadata?: MetadataEntry[];
  storeName?: string;
}

export async function uploadTextToFileSearchStore(options: UploadOptions) {
  const { text, displayName, metadata = [], storeName = DEFAULT_STORE_NAME() } = options;
  const apiKey = GEMINI_API_KEY();
  const buffer = Buffer.from(text, 'utf-8');

  const configPayload: any = {
    display_name: displayName,
    chunking_config: {
      white_space_config: {
        max_tokens_per_chunk: 200,
        max_overlap_tokens: 20,
      },
    },
  };

  if (metadata.length > 0) {
    configPayload.custom_metadata = asMetadataPayload(metadata);
  }

  const startResp = await fetch(`${UPLOAD_BASE}/${storeName}:uploadToFileSearchStore?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': buffer.length.toString(),
      'X-Goog-Upload-Header-Content-Type': 'text/plain',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configPayload),
  });

  if (!startResp.ok) {
    const textResp = await startResp.text();
    throw new Error(`Failed to initiate upload: ${textResp}`);
  }

  const uploadUrl = startResp.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('Upload URL missing from File Search response.');
  }

  const finalizeResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': buffer.length.toString(),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: buffer,
  });

  if (!finalizeResp.ok) {
    const textResp = await finalizeResp.text();
    throw new Error(`Failed to upload content: ${textResp}`);
  }

  const opInfo = await finalizeResp.json();
  const operationName = opInfo.name;
  if (!operationName) {
    return opInfo;
  }
  const completed = await pollOperation(operationName);
  return completed;
}

interface RagSummaryOptions {
  prompt: string;
  userId: string;
  storeName?: string;
}

export async function generateFileSearchSummary(options: RagSummaryOptions) {
  const { prompt, userId, storeName = DEFAULT_STORE_NAME() } = options;
  const apiKey = GEMINI_API_KEY();
  const model = DEFAULT_MODEL();

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    tools: [
      {
        file_search: {
          file_search_store_names: [storeName],
          metadata_filter: `user_id = "${userId}"`,
        },
      },
    ],
  };

  const resp = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const textResp = await resp.text();
    throw new Error(`Failed to generate RAG summary: ${textResp}`);
  }

  const data = await resp.json();
  const candidates = data?.candidates || [];

  const firstCandidate = candidates[0];
  const parts = firstCandidate?.content?.parts || [];
  const summary = parts
    .filter((part: any) => typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\n')
    .trim();

  const groundingMetadata = firstCandidate?.groundingMetadata || firstCandidate?.grounding_metadata || null;

  return {
    summary,
    groundingMetadata,
    raw: data,
  };
}

interface SearchOptions {
  query: string;
  userId: string;
  limit?: number;
  storeName?: string;
}

export async function searchFileSearchStore(options: SearchOptions) {
  const { query, userId, limit = 12, storeName = DEFAULT_STORE_NAME() } = options;
  const apiKey = GEMINI_API_KEY();
  const model = DEFAULT_MODEL();

  const systemInstruction = {
    role: 'system',
    parts: [
      {
        text: [
          'You are a retrieval-only assistant.',
          `Return the top ${limit} relevant passages for the user query.`,
          'Use the File Search tool and respond with JSON only.',
          'Each array item must include: noteId (from metadata.note_id if present, otherwise null), content (<=500 chars), score (0-1 if available),',
          'fileName, chunkId, and uri. Do not add any explanations.',
        ].join(' '),
      },
    ],
  };

  const body = {
    system_instruction: systemInstruction,
    contents: [
      {
        role: 'user',
        parts: [
          { text: query },
        ],
      },
    ],
    tools: [
      {
        file_search: {
          file_search_store_names: [storeName],
          metadata_filter: `user_id = "${userId}"`,
        },
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
    },
  };

  const resp = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const textResp = await resp.text();
    throw new Error(`Failed to search File Search store: ${textResp}`);
  }

  const data = await resp.json();
  const candidate = data?.candidates?.[0] || {};
  const parts = candidate?.content?.parts || [];
  const rawText = parts
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  let parsed: any[] = [];
  if (rawText) {
    try {
      const json = JSON.parse(rawText);
      if (Array.isArray(json)) {
        parsed = json;
      } else if (Array.isArray((json as any).results)) {
        parsed = (json as any).results;
      }
    } catch (e) {
      console.warn('Failed to parse File Search response as JSON:', e);
    }
  }

  const groundingMetadata = candidate?.groundingMetadata || candidate?.grounding_metadata || null;

  const normalizeResult = (item: any): FileSearchResult => ({
    noteId: item.noteId ?? item.note_id ?? null,
    content: item.content || item.text || '',
    score: item.score ?? item.similarity ?? null,
    uri: item.uri || item.url,
    fileName: item.fileName || item.file_name,
    chunkId: item.chunkId || item.chunk_id,
  });

  const results: FileSearchResult[] = parsed.map(normalizeResult).filter((r) => r.content);

  return { results, groundingMetadata, raw: data };
}

export function getFileSearchStoreName() {
  return DEFAULT_STORE_NAME();
}

export function getUserFileSearchStoreName(userId: string) {
  const baseStore = DEFAULT_STORE_NAME();
  const strategy = NAMESPACE_STRATEGY();
  if (strategy === 'store-per-user') {
    return `${baseStore}-${userId}`;
  }
  return baseStore;
}

function extractMetadata(file: any, key: string) {
  const meta = file?.customMetadata || file?.custom_metadata || [];
  const entry = meta.find((m: any) => m.key === key);
  return entry?.stringValue || entry?.string_value || entry?.numericValue || entry?.numeric_value;
}

async function listStoreFiles(storeName: string) {
  const apiKey = GEMINI_API_KEY();
  const resp = await fetch(`${API_BASE}/${storeName}/files?key=${apiKey}`);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to list File Search files: ${text}`);
  }
  const data = await resp.json();
  return data.files || [];
}

export async function listUserFiles({ storeName = DEFAULT_STORE_NAME(), userId }: { storeName?: string; userId: string }) {
  const files = await listStoreFiles(storeName);
  return files.filter((file: any) => extractMetadata(file, 'user_id') === userId);
}

async function deleteFileByName(name: string) {
  const apiKey = GEMINI_API_KEY();
  const resp = await fetch(`${API_BASE}/${name}?key=${apiKey}`, { method: 'DELETE' });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to delete File Search document ${name}: ${text}`);
  }
}

export async function deleteNoteFilesFromStore({ noteId, userId, storeName = DEFAULT_STORE_NAME() }: { noteId: string; userId: string; storeName?: string; }) {
  const files = await listStoreFiles(storeName);
  const matches = files.filter((file: any) => extractMetadata(file, 'note_id') === noteId && extractMetadata(file, 'user_id') === userId);
  await Promise.all(matches.map((file: any) => deleteFileByName(file.name)));
  return matches.map((file: any) => file.name);
}

export async function upsertNoteFileSearchDocument({
  noteId,
  userId,
  title,
  body,
  storeName = DEFAULT_STORE_NAME(),
}: {
  noteId: string;
  userId: string;
  title?: string | null;
  body: string;
  storeName?: string;
}) {
  await deleteNoteFilesFromStore({ noteId, userId, storeName });

  const displayName = `note-${noteId.slice(0, 8)}`;
  const filePayload = [
    `note_id: ${noteId}`,
    `user_id: ${userId}`,
    title ? `title: ${title}` : '',
    '',
    body,
  ]
    .filter(Boolean)
    .join('\n');

  return uploadTextToFileSearchStore({
    text: filePayload,
    displayName,
    storeName,
    metadata: [
      { key: 'user_id', value: userId },
      { key: 'note_id', value: noteId },
    ],
  });
}
import { Buffer } from 'node:buffer';
