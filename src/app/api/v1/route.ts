import { NextRequest, NextResponse } from 'next/server';
import { handleSearch, handleCreateGeminiEmbedding, handleGenerate } from '@server/routes/searchHandlers';
import {
  handleCalendar,
  handleGetNotesForDate,
  handleGetFullNotesForDate,
  handleSummarizeDay,
} from '@server/routes/calendarHandlers';
import {
  handleGetThreads,
  handleGenerateThread,
} from '@server/routes/threadHandlers';
import {
  handleGetNote,
  handleGetNoteAttachments,
  handleUpdateNote,
  handleGetAllNotes,
} from '@server/routes/noteHandlers';
import {
  handleFindContextCluster,
  handleGetBacklinks,
  handleGetConnections,
} from '@server/routes/connectionHandlers';
import { handleChatBundleSync } from '@server/routes/chatBundleHandler';
import { handleChatCoach, handleSummarizeConversation } from '@server/routes/coachHandlers';

// Vercel -> Next.js Adapter
function createAdapter(req: NextRequest) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());

  let responseBody: any = null;
  let responseStatus = 200;

  const res: any = {
    status: (code: number) => {
      responseStatus = code;
      return res;
    },
    json: (body: any) => {
      responseBody = body;
      return res;
    },
  };

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const adaptedReq: any = {
    query,
    headers,
    method: req.method,
  };

  return { adaptedReq, res, getResponse: () => NextResponse.json(responseBody, { status: responseStatus }) };
}

async function handleAction(action: string, req: NextRequest) {
  const { adaptedReq, res, getResponse } = createAdapter(req);

  try {
    // If method has body, pre-read it
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        adaptedReq.body = await req.json();
      } catch (e) {
        adaptedReq.body = {};
      }
    }

    switch (action) {
      case 'search': await handleSearch(adaptedReq, res); break;
      case 'create-embedding':
      case 'create-gemini-embedding': await handleCreateGeminiEmbedding(adaptedReq, res); break;
      case 'generate': await handleGenerate(adaptedReq, res); break;
      case 'calendar': await handleCalendar(adaptedReq, res); break;
      case 'get-threads': await handleGetThreads(adaptedReq, res); break;
      case 'generate-thread': await handleGenerateThread(adaptedReq, res); break;
      case 'get-backlinks': await handleGetBacklinks(adaptedReq, res); break;
      case 'get-connections': await handleGetConnections(adaptedReq, res); break;
      case 'get-all-notes': await handleGetAllNotes(adaptedReq, res); break;
      case 'find-context-cluster': await handleFindContextCluster(adaptedReq, res); break;
      case 'get-note': await handleGetNote(adaptedReq, res); break;
      case 'get-note-attachments': await handleGetNoteAttachments(adaptedReq, res); break;
      case 'get-notes-for-date': await handleGetNotesForDate(adaptedReq, res); break;
      case 'get-full-notes-for-date': await handleGetFullNotesForDate(adaptedReq, res); break;
      case 'summarize-day': await handleSummarizeDay(adaptedReq, res); break;
      case 'update-note': await handleUpdateNote(adaptedReq, res); break;
      case 'chat-bundle-sync': await handleChatBundleSync(adaptedReq, res); break;
      case 'chat-coach': await handleChatCoach(adaptedReq, res); break;
      case 'summarize-conversation': await handleSummarizeConversation(adaptedReq, res); break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return getResponse();
  } catch (error: any) {
    console.error(`API Error [${action}]:`, error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message,
      action 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');
  if (!action) return NextResponse.json({ error: 'No action' }, { status: 400 });
  return handleAction(action, req);
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');
  if (!action) return NextResponse.json({ error: 'No action' }, { status: 400 });
  return handleAction(action, req);
}
