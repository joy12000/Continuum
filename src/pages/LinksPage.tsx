import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { LinksTimeline } from './Links/LinksTimeline';
import { supabase } from '../lib/supabase';
import { listNotes } from '../lib/supabaseService';

// LinksTimeline expects a slightly different Note type, so we define it here for clarity
// This is based on the type definition within LinksTimeline.tsx
type TimelineNote = {
  id: string;
  title?: string;
  body?: string;
  content?: string; 
  created_at?: string;
  tags?: string[];
  citations?: { noteId: string }[];
};

const LinksPage = () => {
  const [notes, setNotes] = useState<TimelineNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not logged in.");
        }
        
        const fetchedNotes = await listNotes(user.id);
        if (fetchedNotes) {
          // Map the data from listNotes to match the TimelineNote type
          const timelineNotes = fetchedNotes.map(n => ({
            id: n.id,
            title: n.title || '',
            body: n.body || '',
            content: n.body || '', // Use body for content as well
            created_at: n.created_at,
            tags: n.tags || [],
            citations: n.citations || [],
          }));
          setNotes(timelineNotes);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  return (
    <PageLayout title="Connections">
      {loading && (
        <div className="flex items-center justify-center h-full text-gray-400">
          Loading connections...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-full text-red-500">
          Error: {error}
        </div>
      )}
      {!loading && !error && notes.length > 0 && (
        <LinksTimeline notes={notes} />
      )}
      {!loading && !error && notes.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400">
          No notes found to build connections from.
        </div>
      )}
    </PageLayout>
  );
};

export default LinksPage;