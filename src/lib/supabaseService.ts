import { supabase } from './supabase';
import { toSentences } from './rag/chunker';

// 문장 기반 청크러: 길이 기준으로 묶고, 다음 청크에 꼬리(overlap) 조금 남깁니다.
function chunkBySentence(htmlOrText: string, size = 512, overlap = 50): string[] {
  const sents = toSentences(htmlOrText);
  const out: string[] = [];
  let buf = '';

  for (const s of sents) {
    const next = (buf ? buf + ' ' : '') + s;
    if (next.length > size && buf) {
      out.push(buf.trim());
      if (overlap > 0) {
        const tail = buf.slice(Math.max(0, buf.length - overlap));
        buf = (tail + ' ' + s).trim();
      } else {
        buf = s;
      }
    } else {
      buf = next;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'generate_embeddings', texts: chunks }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to generate embeddings: ${error.error}`);
  }

  const data = await response.json();
  return data.embeddings;
}

export async function addNoteAndChunks(note: { title?: string; body: string; user_id: string; }) {
  const { data: noteData, error: noteError } = await supabase
    .from('notes')
    .insert({ title: note.title, body: note.body, user_id: note.user_id })
    .select()
    .single();

  if (noteError) {
    console.error('Error inserting note:', noteError);
    throw noteError;
  }
  if (!noteData) throw new Error('Failed to insert note.');

  const chunks = chunkBySentence(note.body, 512, 50);
  const embeddings = await generateEmbeddings(chunks);

  const chunkData = chunks.map((chunk, i) => ({
    note_id: noteData.id,
    chunk_index: i,
    content: chunk,
    embedding: embeddings[i],
    lang: 'ko',
  }));

  const { error: chunkError } = await supabase.from('note_chunks').insert(chunkData);

  if (chunkError) {
    console.error('Error inserting chunks:', chunkError);
    throw chunkError;
  }

  return noteData;
}

export async function searchChunks(params: { query: string; userId: string; }) {
  try {
    const [queryEmbedding] = await generateEmbeddings([params.query]);
    if (!queryEmbedding) {
      return [];
    }

    const rpcParams = {
      q_emb: queryEmbedding as any,
      uid: params.userId,
      limit_k: 10,
    };

    const { data, error } = await supabase.rpc('search_chunks', rpcParams);

    if (error) {
      console.error('Error searching chunks:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error("An unexpected error occurred in searchChunks:", e);
    return [];
  }
}
