import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CalendarMonth from '../components/CalendarMonth';
import { supabase } from '../lib/supabase';
import type { Note } from '../types/common';
import PageLayout from '../components/PageLayout';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SkyBackground from '../components/SkyBackground';

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

// API 호출 함수: 하루 노트 요약 생성
const fetchDailySummary = async (notes: Note[] | undefined): Promise<{ title: string; summary: string } | null> => {
  if (!notes || notes.length === 0) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const response = await fetch(`/api/v1?action=summarize-day`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '하루 요약을 생성하는 데 실패했습니다.');
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

  // 하루 요약 생성 쿼리
  const { data: dailySummary, isLoading: isSummaryLoading, error: summaryError } = useQuery<{ title: string; summary: string } | null, Error>({
    queryKey: ['dailySummary', selectedDate],
    queryFn: () => fetchDailySummary(notesForSelectedDay),
    enabled: !!notesForSelectedDay && notesForSelectedDay.length > 0, // 노트가 성공적으로 로드되고 비어있지 않을 때만 실행
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
    setDisplayDate(current => {
      const newDate = new Date(current);
      newDate.setDate(1); // Day-of-month overflow/underflow 방지
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const pageTitle = `${year}년 ${displayDate.toLocaleString('ko-KR', { month: 'long' })}`;

  return (
    <PageLayout title="캘린더" transparent>
      <SkyBackground />
      <div className="bg-black/30 backdrop-blur-sm p-4 sm:p-6 rounded-xl">
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Previous month"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-2xl font-bold text-center">{pageTitle}</h1>
        <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Next month"><ChevronRight className="w-6 h-6" /></button>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-3/5">
          {isActivityLoading ? <div className="text-center p-8 text-gray-400">캘린더 로딩 중...</div> : activityError ? <div className="text-center p-8 text-red-500">캘린더 로딩 오류: {activityError.message}</div> : (
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
        <div className="lg:w-2/5">
          <h2 className="text-xl font-semibold text-sky-300 mb-4">{selectedDate}</h2>
          <div className="space-y-4">
            {/* AI 요약 섹션 */}
            {isSummaryLoading && (
              <div className="p-4 rounded-lg bg-white/5 text-center text-gray-400 animate-pulse">하루를 연결하는 중...</div>
            )}
            {summaryError && (
              <div className="p-4 rounded-lg bg-red-900/50 text-red-400">
                <p className="font-bold">요약 생성 오류</p><p className="text-sm mt-1">{summaryError.message}</p>
              </div>
            )}
            {dailySummary && (
              <div className="p-4 rounded-lg bg-sky-900/30 border border-sky-700/50 mb-4">
                <h3 className="font-bold text-lg text-sky-300">{dailySummary.title}</h3>
                <p className="text-sm text-gray-300 mt-2 whitespace-pre-line">{dailySummary.summary}</p>
              </div>
            )}

            {/* 노트 목록 섹션 */}
            {areNotesLoading && <p className="text-center text-gray-400">노트 로딩 중...</p>}
            {notesError && <p className="text-center text-red-500">오류: {notesError.message}</p>}
            {notesForSelectedDay && notesForSelectedDay.length > 0 ? (
              <ul className="space-y-3">
                {notesForSelectedDay.map(note => (
                  <li key={note.id}>
                    <Link to={`/notes/${note.id}`} className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200">
                      <h3 className="font-semibold text-sky-400 truncate">{note.title || '제목 없음'}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1">{note.body}</p>
                      <div className="text-xs text-gray-500 mt-2 text-right">{new Date(note.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              !areNotesLoading && !isSummaryLoading && <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-700 rounded-lg"><p>이 날짜에 작성된 노트가 없습니다.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PageLayout>
  );
};

export default CalendarPage;
