import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import { supabase } from '@/lib/supabase';
import type { Note } from '../../lib/types'; // Corrected path

// --- Type Definitions ---
interface Backlink {
  from_note_id: string;
  to_note_id: string;
  title: string | null;
}

interface Connection {
  note_id: string;
  title: string | null;
  score: number;
}

interface BacklinksResponse {
    note_id: string;
    backlinks: Backlink[];
}

interface ConnectionsResponse {
    note_id: string;
    connections: Connection[];
}

// --- API Fetching Functions ---
const fetchNoteDetails = async (noteId: string): Promise<Note> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const response = await fetch(`/api/v1?action=get-note&noteId=${noteId}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (!response.ok) throw new Error('Failed to fetch note details');
  return response.json();
};

const fetchBacklinks = async (noteId: string): Promise<BacklinksResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const response = await fetch(`/api/v1?action=get-backlinks&noteId=${noteId}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (!response.ok) throw new Error('Failed to fetch backlinks');
  return response.json();
};

const fetchConnections = async (noteId: string): Promise<ConnectionsResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const response = await fetch(`/api/v1?action=get-connections&noteId=${noteId}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (!response.ok) throw new Error('Failed to fetch connections');
  return response.json();
};

// --- Main Component ---
const NoteDetailPage = () => {
  const { noteId } = useParams<{ noteId: string }>();

  if (!noteId) {
    return <div>Note ID not found.</div>;
  }

  const { data: note, isLoading: isLoadingNote, error: errorNote } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: () => fetchNoteDetails(noteId),
  });

  const { data: backlinksData, isLoading: isLoadingBacklinks } = useQuery<BacklinksResponse, Error>({
    queryKey: ['backlinks', noteId],
    queryFn: () => fetchBacklinks(noteId),
  });

  const { data: connectionsData, isLoading: isLoadingConnections } = useQuery<ConnectionsResponse, Error>({
    queryKey: ['connections', noteId],
    queryFn: () => fetchConnections(noteId),
  });

  const renderContent = () => {
    if (isLoadingNote) {
      return <div className="text-center p-8">Loading note...</div>;
    }
    if (errorNote) {
      return <div className="text-center p-8 text-red-500">Error loading note: {errorNote.message}</div>;
    }
    if (!note) {
      return <div className="text-center p-8">Note not found.</div>;
    }

    return (
      <div className="p-4 md:p-6">
        <h1 className="text-3xl font-bold mb-4 text-sky-400">{note.title || 'Untitled Note'}</h1>
        <div className="prose prose-invert max-w-none bg-slate-800/50 p-4 rounded-lg">
          <p>{note.content}</p>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Backlinks Section */}
          <div>
            <h2 className="text-xl font-bold mb-3">Backlinks</h2>
            {isLoadingBacklinks ? (
              <p>Loading backlinks...</p>
            ) : backlinksData?.backlinks && backlinksData.backlinks.length > 0 ? (
              <ul className="space-y-2">
                {backlinksData.backlinks.map((link: Backlink) => (
                  <li key={link.from_note_id} className="p-3 bg-slate-800/50 rounded-lg">
                    <Link to={`/notes/${link.from_note_id}`} className="hover:text-sky-400">
                      {link.title || 'Untitled Note'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No backlinks found.</p>
            )}
          </div>

          {/* Connections Section */}
          <div>
            <h2 className="text-xl font-bold mb-3">Connections</h2>
            {isLoadingConnections ? (
              <p>Loading connections...</p>
            ) : connectionsData?.connections && connectionsData.connections.length > 0 ? (
              <ul className="space-y-2">
                {connectionsData.connections.map((conn: Connection) => (
                  <li key={conn.note_id} className="p-3 bg-slate-800/50 rounded-lg flex justify-between items-center">
                    <Link to={`/notes/${conn.note_id}`} className="hover:text-sky-400">
                      {conn.title || 'Untitled Note'}
                    </Link>
                    <span className="text-sm text-gray-400">Score: {conn.score.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No connections found.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageLayout title="Note Details">
      {renderContent()}
    </PageLayout>
  );
};

export default NoteDetailPage;
