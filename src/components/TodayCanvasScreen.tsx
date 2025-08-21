import React, { useState, useEffect } from 'react';
import { RichNoteEditor } from './RichNoteEditor';
import { db, Note } from '../lib/db';

const NOTE_ID = 'today-canvas';

export function TodayCanvasScreen() {
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    const loadNote = async () => {
      let todayNote = await db.notes.get(NOTE_ID);
      if (!todayNote) {
        todayNote = {
          id: NOTE_ID,
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['today'],
        };
        await db.notes.put(todayNote);
      }
      setNote(todayNote);
    };

    loadNote();
  }, []);

  const handleNoteChange = (content: string) => {
    if (note) {
      const updatedNote = { ...note, content, updatedAt: Date.now() };
      setNote(updatedNote);
      db.notes.put(updatedNote);
    }
  };

  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  if (!note) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen p-4">
      <header className="text-center mb-4">
        <h1 className="text-lg font-semibold">{dateFormatter.format(today)}</h1>
      </header>
      <div className="flex-grow">
        <RichNoteEditor
          note={note}
          onSave={handleNoteChange}
          autoFocus={true}
          hideSaveButton={true}
        />
      </div>
    </div>
  );
}
