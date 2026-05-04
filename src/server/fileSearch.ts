import { Buffer } from 'node:buffer';

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
const DEFAULT_MODEL = () => process.env.GEMINI_FILE_SEARCH_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

export function getFileSearchStoreName() {
  return DEFAULT_STORE_NAME();
}
