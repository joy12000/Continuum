import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CalendarMonth from '../components/CalendarMonth';
import { supabase } from '../lib/supabase';
import type { Note } from '../types/common';
import type { Session } from '@supabase/supabase-js';
import PageLayout from '../components/PageLayout';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

import { NoteDetailModal } from '../components/NoteDetailModal';
import { CalendarNoteListItem } from '../components/CalendarNoteListItem';
import SkyCanvasAnimation from '../components/SkyCanvasAnimation';

// 캘린더 활동 데이터 타입 정의
type NoteActivity = {
  activity_date: string; // 'YYYY-MM-DD'
  count: number;
};

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// API 호출 함수: 특정 날짜의 노트 목록 가져오기 (이제 본문은 제외)
type NoteTitle = Pick<Note, 'id' | 'title' | 'createdAt'>;
const fetchNotesForDate = async (date: string | null): Promise<NoteTitle[]> => {
  if (!date) return [];

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const response = await fetch(`/api/v1?action=get-notes-for-date&date=${date}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '선택한 날짜의 노트를 불러오는데 실패했습니다.');
  }
  return response.json();
};

// API 호출 함수: 하루 노트 요약 생성
const fetchDailySummary = async (date: string | null): Promise<{ title: string; summary: string } | null> => {
  if (!date) return null;
  // This function now needs to fetch the notes for the summary itself.
  // Or be disabled until notes are fully loaded, which is complex.
  // For now, we disable it and can re-enable it later if needed.
  // This is a placeholder to show the summary logic would need adjustment.
  return null;
};

// API 호출 함수: 월별 노트 활동(개수) 가져오기
export const fetchNoteActivity = async (startDate: string, endDate: string): Promise<NoteActivity[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    const response = await fetch(`/api/v1?action=calendar&start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '노트 활동을 불러오는데 실패했습니다.');
    }
    return response.json();
}

const CalendarPage = ({ session }: { session: Session | null }) => {
  const [selectedDate, setSelectedDate] = useState<string>(ymd(new Date()));
  const [displayDate, setDisplayDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const handleNoteClick = (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsModalOpen(true);
  };

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data: activityData, isLoading: isActivityLoading, error: activityError } = useQuery<NoteActivity[], Error>({
    queryKey: ['noteActivity', year, month],
    queryFn: () => fetchNoteActivity(firstDayOfMonth, lastDayOfMonth),
    enabled: !!session,
  });

  const { data: notesForSelectedDay, isLoading: areNotesLoading, error: notesError } = useQuery<NoteTitle[], Error>({
    queryKey: ['notesForDate', selectedDate],
    queryFn: () => fetchNotesForDate(selectedDate),
    enabled: !!selectedDate && !!session,
  });
  
  // Daily summary is disabled for now as it requires full note bodies which are no longer fetched upfront.
  const isSummaryLoading = false;
  const summaryError = null;
  const dailySummary = null;

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
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setDisplayDate(today);
    setSelectedDate(ymd(today));
  };

  const pageTitle = `${year} ${displayDate.toLocaleString('ko-KR', { month: 'long' })}`;

  return (
    <PageLayout title="캘린더" hideBackButton={true}>
      <SkyCanvasAnimation />
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="이전 달"><ChevronLeftIcon className="w-6 h-6" /></button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-center">{pageTitle}</h1>
            <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-primary-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors">오늘</button>
          </div>
          <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="다음 달"><ChevronRightIcon className="w-6 h-6" /></button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-card border border-border rounded-lg p-4 shadow-lg">
            {isActivityLoading ? <div className="text-center p-8 text-muted-foreground">캘린더 로딩 중...</div> : activityError ? <div className="text-center p-8 text-destructive">오류: {activityError.message}</div> : (
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
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-primary mb-4">{selectedDate}</h2>
            <div className="space-y-4">
              {/* Summary section is temporarily disabled */}

              {areNotesLoading && <p className="text-center text-muted-foreground">노트 목록 로딩 중...</p>}
              {notesError && <p className="text-center text-destructive">오류: {notesError.message}</p>}
              {notesForSelectedDay && notesForSelectedDay.length > 0 ? (
                <ul className="space-y-3">
                  {notesForSelectedDay.map(note => (
                    <CalendarNoteListItem
                      key={note.id}
                      noteId={note.id}
                      title={note.title}
                      createdAt={note.createdAt}
                      onNoteClick={handleNoteClick}
                    />
                  ))}
                </ul>
              ) : (
                !areNotesLoading && <div className="text-center text-muted-foreground p-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center"><CalendarIcon className="w-12 h-12 mb-4"/><p>이 날짜에 노트가 없습니다.</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedNoteId && <NoteDetailModal noteId={selectedNoteId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </PageLayout>
  );
};

export default CalendarPage;