
import React, { useState, useMemo } from 'react';
import CalendarMonth from '../components/CalendarMonth'; // Corrected: default import
import { db, Note } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

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

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth(); // 0-indexed

  // 1. Fetch all notes for the currently displayed month
  const notesForMonth = useLiveQuery(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    return db.notes.where('createdAt').between(start, end).toArray();
  }, [year, month], [] as Note[]);

  // 2. Transform the flat notes array into a structure grouped by date (YYYY-MM-DD)
  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const note of notesForMonth) {
      const key = ymd(new Date(note.createdAt));
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(note);
    }
    return map;
  }, [notesForMonth]);

  const notesForSelectedDay = notesByDate[selectedDate] || [];

  // Handler to change month (not fully implemented, but for structure)
  const handleMonthChange = (offset: number) => {
    setDisplayDate(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {displayDate.toLocaleString('default', { month: 'long' })} {year}
        </h1>
        <div className="space-x-2">
          <button onClick={() => handleMonthChange(-1)} className="p-2 border rounded">Prev</button>
          <button onClick={() => handleMonthChange(1)} className="p-2 border rounded">Next</button>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <CalendarMonth 
            year={year}
            month={month}
            weekLabels={WEEK_LABELS}
            notesByDate={notesByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
        <div className="md:w-1/2">
          <h2 className="text-xl font-semibold">Notes for {selectedDate}</h2>
          {notesForSelectedDay.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {notesForSelectedDay.map(note => (
                <li key={note.id} className="p-2 border rounded-lg hover:bg-gray-100">
                  {note.title || 'Untitled Note'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-gray-500">No notes for this day.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
