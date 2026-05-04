'use server';
import { getGenerativeModel, getEmbedding as getGeminiEmbedding } from './generativeai';
import { CHAT_HISTORY_MARKER } from '../lib/supabaseService';

// Types derived from your Schema
export type UUID = string;

export interface Note {
  id: UUID;
  user_id: UUID;
  title: string;
  body: string;
  tags?: string[];
  embedding?: number[];
  createdAt: number;
  updatedAt?: number;
}

export interface Thread {
  threadId: string;
  title: string;
  summary: string;
  noteIds: UUID[];
  lastUpdatedAt: string;
}

// AI Utility - Summarization & Embedding

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text) return new Array(768).fill(0);
  try {
    return await getGeminiEmbedding(text);
  } catch (e) {
    console.error(e);
    return new Array(768).fill(0);
  }
}

export async function summarizeThread(notes: Note[]): Promise<{ title: string; summary: string }> {
  if (notes.length === 0) return { title: "Empty Thread", summary: "No content to summarize." };

  const combined = notes.map(n => n.body).join("\n\n---\n\n");
  try {
    const model = getGenerativeModel();
    const prompt = `
      Analyze the following notes and provide:
      1. A short, creative title (max 5 words).
      2. A concise summary (1-2 sentences).
      
      Return ONLY a JSON object in this format:
      {"title": "...", "summary": "..."}

      Notes:
      ${combined}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json\s?/, "").replace(/```/, "").trim();
    
    try {
      const data = JSON.parse(text);
      return { 
        title: data.title || "Daily Theme", 
        summary: data.summary || "Summary generated." 
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return { 
        title: "Daily Theme", 
        summary: text.substring(0, 200) 
      };
    }
  } catch (e) {
    console.error('Summarization error:', e);
    return { title: "Summary Error", summary: "Could not generate summary." };
  }
}

// --- RESTORED EXPORTS ---

export async function generateTitleAndTags(body: string): Promise<{ title: string; tags: string[] }> {
  if (!body) return { title: "Untitled", tags: [] };
  try {
    const model = getGenerativeModel();
    const prompt = `
      Based on the following content, generate:
      1. A suitable title (max 6 words).
      2. Exactly 3 relevant keywords/tags.
      
      Return ONLY a JSON object in this format:
      {"title": "...", "tags": ["tag1", "tag2", "tag3"]}

      Content:
      ${body}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json\s?/, "").replace(/```/, "").trim();
    
    try {
      const data = JSON.parse(text);
      return { 
        title: data.title || "New Note", 
        tags: data.tags || [] 
      };
    } catch {
      return { title: "New Note", tags: [] };
    }
  } catch (e) {
    console.error('Title/Tag generation error:', e);
    return { title: "New Note", tags: [] };
  }
}

export async function connectNewNote(query: string, context: string): Promise<string> {
  try {
    const model = getGenerativeModel();
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const formattedContext = Array.isArray(context) 
      ? context.map((n: any) => {
          const dateStr = n.createdAt 
            ? new Date(n.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
            : 'unknown date';
          const cleanBody = (n.body || '').split(CHAT_HISTORY_MARKER)[0].trim();
          return `[Written on: ${dateStr}]\nNote: ${n.title || 'Untitled'}\nContent: ${cleanBody}`;
        }).join('\n\n')
      : typeof context === 'string' ? context : JSON.stringify(context);

    const prompt = `
      You are a helpful assistant. Answer the user's question based on the provided context (which are user's notes).
      Be concise and informative. If the context doesn't have enough information, mention that.
      Always respond in Korean.
      
      Today's date: ${today}
      
      Question: ${query}
      
      Context:
      ${formattedContext}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || "No response generated.";
  } catch (e) {
    console.error('Connection error:', e);
    return "Error connecting notes.";
  }
}

export async function summarizeDay(notes: any[]): Promise<{ title: string; summary: string }> {
  if (!notes || notes.length === 0) return { title: "Quiet Day", summary: "No activities today." };
  return summarizeThread(notes as Note[]);
}

