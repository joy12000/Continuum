import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Connection {
  note_id: string;
  title: string;
  score: number;
}

interface ConnectionsListViewProps {
  noteId: string;
}

// A custom hook to fetch connections (encapsulated within the component for simplicity)
function useConnections(noteId: string | undefined) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) return;

    const fetchConnections = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch(`/api/v1?action=get-connections&noteId=${noteId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch connections: ${res.statusText}`);
        }

        const data = await res.json();
        setConnections(data.connections || []);
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [noteId]);

  return { connections, loading, error };
}

export default function ConnectionsListView({ noteId }: ConnectionsListViewProps) {
  const { connections, loading, error } = useConnections(noteId);

  if (loading) {
    return <div className="p-4 text-center text-white">Loading connections...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-1">
      <h2 className="text-xl font-bold text-sky-300 mb-4">Connected Notes</h2>
      {connections.length === 0 ? (
        <p className="text-gray-400">No connections found for this note.</p>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {connections.map(conn => (
            <li key={conn.note_id}>
              <Link 
                to={`/notes/${conn.note_id}`}
                className="block border border-white/10 bg-[#0b1830]/60 p-3 rounded-md hover:bg-white/20 transition-colors duration-200"
              >
                <h3 className="font-semibold text-sky-400 truncate">{conn.title || 'Untitled Note'}</h3>
                <p className="text-xs text-gray-400 mt-1">Relevance: {conn.score.toFixed(3)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
