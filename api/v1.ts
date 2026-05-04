import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSearch, handleCreateGeminiEmbedding, handleGenerate } from '../src/server/routes/searchHandlers';
import {
  handleCalendar,
  handleGetNotesForDate,
  handleGetFullNotesForDate,
  handleSummarizeDay,
} from '../src/server/routes/calendarHandlers';
import {
  handleGetThreads,
  handleGenerateThread,
} from '../src/server/routes/threadHandlers';
import {
  handleGetNote,
  handleGetNoteAttachments,
  handleUpdateNote,
  handleGetAllNotes,
} from '../src/server/routes/noteHandlers';
import {
  handleFindContextCluster,
  handleGetBacklinks,
  handleGetConnections,
} from '../src/server/routes/connectionHandlers';
import { handleChatBundleSync } from '../src/server/routes/chatBundleHandler';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
    switch (action) {
      case 'search':
        return await handleSearch(req, res);
      case 'create-embedding':
      case 'create-gemini-embedding':
        return await handleCreateGeminiEmbedding(req, res);
      case 'generate':
        return await handleGenerate(req, res);
      case 'calendar':
        return await handleCalendar(req, res);
      case 'get-threads':
        return await handleGetThreads(req, res);
      case 'generate-thread':
        return await handleGenerateThread(req, res);
      case 'get-backlinks':
        return await handleGetBacklinks(req, res);
      case 'get-connections':
        return await handleGetConnections(req, res);
      case 'get-all-notes':
        return await handleGetAllNotes(req, res);
      case 'find-context-cluster':
        return await handleFindContextCluster(req, res);
      case 'get-note':
        return await handleGetNote(req, res);
      case 'get-note-attachments':
        return await handleGetNoteAttachments(req, res);
      case 'get-notes-for-date':
        return await handleGetNotesForDate(req, res);
      case 'get-full-notes-for-date':
        return await handleGetFullNotesForDate(req, res);
      case 'summarize-day':
        return await handleSummarizeDay(req, res);
      case 'update-note':
        return await handleUpdateNote(req, res);
      case 'chat-bundle-sync':
        return await handleChatBundleSync(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e: any) {
    const msg = e?.message || 'API handler failed';
    return res.status(500).json({ error: msg });
  }
}
