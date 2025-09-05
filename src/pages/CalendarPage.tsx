import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CalendarMonth from '../components/CalendarMonth';
import { supabase } from '../lib/supabase';
import type { Note } from '../types/common';
import PageLayout from '../components/PageLayout';
import '../styles/calendar.css'; // Import the new styles
import { useQuery } from '@tanstack/react-query';

// 캘린더 활동 데이터 타입 정의
type NoteActivity = {
  activity_date: string; // 'YYYY-MM-DD'
  count: number;
};

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// API 호출 함수: 특정 날짜의 노트 목록 가져오기
const fetchNotesForDate = async (date: string | null): Promise<Note[]> => {
  if (!date) return [];

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const response = await fetch(`/api/v1?action=get-notes-for-date&date=${date}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '선택한 날짜의 노트를 불러오는 데 실패했습니다.');
  }
  return response.json();
};

// API 호출 함수: 월별 노트 활동(개수) 가져오기
const fetchNoteActivity = async (startDate: string, endDate: string): Promise<NoteActivity[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    const response = await fetch(`/api/v1?action=calendar&start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '노트 활동 정보를 불러오는 데 실패했습니다.');
    }
    return response.json();
}

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<string>(ymd(new Date()));
  const [displayDate, setDisplayDate] = useState(new Date());

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // [개선] 월별 노트 활동(개수)만 가져오는 쿼리 (매우 효율적)
  const { data: activityData, isLoading: isActivityLoading, error: activityError } = useQuery<NoteActivity[], Error>({
    queryKey: ['noteActivity', year, month],
    queryFn: () => fetchNoteActivity(firstDayOfMonth, lastDayOfMonth),
  });

  // [개선] 사용자가 날짜를 클릭했을 때만 해당 날짜의 노트 목록을 가져오는 쿼리
  const { data: notesForSelectedDay, isLoading: areNotesLoading, error: notesError } = useQuery<Note[], Error>({
    queryKey: ['notesForDate', selectedDate],
    queryFn: () => fetchNotesForDate(selectedDate),
    enabled: !!selectedDate, // selectedDate가 있을 때만 쿼리 실행
  });

  // `CalendarMonth` 컴포넌트에 전달할 날짜별 노트 유무 데이터
  const notesByDate = useMemo(() => {
    const map: Record<string, Note[]> = {};
    if (activityData) {
      for (const activity of activityData) {
        map[activity.activity_date] = Array.from({ length: activity.count }, () => ({} as Note));
      }
    }
    return map;
  }, [activityData]);

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
          {isActivityLoading ? (
            <div className="text-center p-8">캘린더 로딩 중...</div>
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
          {areNotesLoading && <p className="mt-4 text-gray-400">노트 로딩 중...</p>}
          {notesError && <p className="mt-4 text-red-500">오류: {notesError.message}</p>}
          {notesForSelectedDay && notesForSelectedDay.length > 0 ? (
            <ul className="space-y-3">
              {notesForSelectedDay.map(note => (
                <li key={note.id}>
                  <Link to={`/notes/${note.id}`} className="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <h3 className="font-semibold text-sky-400 truncate">{note.title || '제목 없음'}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mt-1">{note.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !areNotesLoading && <p className="mt-4 text-gray-400">이 날짜에 작성된 노트가 없습니다.</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default CalendarPage;