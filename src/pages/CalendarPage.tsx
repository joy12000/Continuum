import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CalendarMonth from '../components/CalendarMonth';
import { supabase } from '../lib/supabase';
import { Note } from '../types/common';
import PageLayout from '../components/PageLayout';
import '../styles/calendar.css'; // Import the new styles

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<string>(ymd(new Date()));
  const [displayDate, setDisplayDate] = useState(new Date());
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth(); // 0-indexed

  useEffect(() => {
    const fetchNotesForMonth = async () => {
      setLoading(true);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        console.error("Error fetching notes for month:", error);
        setNotes([]);
      } else {
        const mappedNotes: Note[] = data.map((n: any) => ({
          id: n.id,
          body: n.body,
          title: n.title,
          tags: n.tags || [],
          citations: n.citations || [],
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at).getTime(),
        }));
        setNotes(mappedNotes);
      }
      setLoading(false);
    };

    fetchNotesForMonth();
  }, [year, month]);

  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const note of notes) {
      const key = ymd(new Date(note.createdAt));
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(note);
    }
    return map;
  }, [notes]);

  const notesForSelectedDay = notesByDate[selectedDate] || [];

  const handleMonthChange = (offset: number) => {
    setDisplayDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <PageLayout title={`${displayDate.toLocaleString('default', { month: 'long' })} ${year}`}>
      <div className="flex justify-end items-center mb-4">
        <div className="space-x-2">
          <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors">Prev</button>
          <button onClick={() => handleMonthChange(1)} className="p-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors">Next</button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-3/5">
          {loading ? (
            <div className="text-center p-8">Loading...</div>
          ) : (
            <CalendarMonth 
              year={year}
              month={month}
              weekLabels={WEEK_LABELS}
              notesByDate={notesByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>
        <div className="md:w-2/5">
          <h2 className="text-xl font-semibold text-sky-300 mb-4">Notes for {selectedDate}</h2>
          {notesForSelectedDay.length > 0 ? (
            <ul className="space-y-3">
              {notesForSelectedDay.map(note => (
                <li key={note.id}>
                  <Link to={`/notes/${note.id}`} className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <h3 className="font-semibold text-sky-400 truncate">{note.title || 'Untitled Note'}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">{note.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-gray-400">No notes for this day.</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default CalendarPage;
