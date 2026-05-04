import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service_role key required for bulk operations
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

async function getEmbedding(text: string) {
  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  } as any);
  return result.embedding.values;
}

// Simple sentence chunker (re-implemented to avoid dependency issues in script)
function chunkText(text: string, size = 512): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|\s*\n\s*|[^.!?]+/g) || [text];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > size && buf) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function run() {
  console.log("Starting re-embedding process...");

  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, title, body');

  if (notesError) {
    console.error("Error fetching notes:", notesError);
    return;
  }

  console.log(`Found ${notes.length} notes to process.`);

  for (const note of notes) {
    console.log(`Processing note: ${note.title || note.id}`);

    const chunks = chunkText(note.body);
    const newChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      // Apply Gemini Embedding 2 document structure
      const structuredText = `title: ${note.title || 'none'} | text: ${content}`;
      const embedding = await getEmbedding(structuredText);
      
      newChunks.push({
        note_id: note.id,
        chunk_index: i,
        content,
        embedding,
        lang: 'ko'
      });
    }

    // Transactional-ish update: Delete old and insert new
    const { error: deleteError } = await supabase
      .from('note_chunks')
      .delete()
      .eq('note_id', note.id);

    if (deleteError) {
      console.error(`Error deleting old chunks for note ${note.id}:`, deleteError);
      continue;
    }

    const { error: insertError } = await supabase
      .from('note_chunks')
      .insert(newChunks);

    if (insertError) {
      console.error(`Error inserting new chunks for note ${note.id}:`, insertError);
    } else {
      console.log(`Successfully re-embedded note: ${note.id}`);
    }
  }

  console.log("Re-embedding process completed.");
}

run().catch(console.error);
