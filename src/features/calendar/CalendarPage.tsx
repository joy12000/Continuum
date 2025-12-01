import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import CalendarMonth from '../../components/CalendarMonth';
import PageLayout from '../../components/PageLayout';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import { CalendarNoteListItem } from '../../components/CalendarNoteListItem';
import type { Note } from '../../types/common';
import { useNoteActivity, useNotesForDate, useDailySummary } from './hooks/useCalendar';

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

const CalendarPage = () => {
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

    // Hooks
    const { data: activityData, isLoading: isActivityLoading, error: activityError } = useNoteActivity(year, month);
    const { data: notesForSelectedDay, isLoading: areNotesLoading, error: notesError } = useNotesForDate(selectedDate);

    const hasActivity = activityData?.some(a => a.activity_date === selectedDate && a.count > 0) ?? false;
    const { data: dailySummary, isLoading: isSummaryLoading, error: summaryError } = useDailySummary(selectedDate, hasActivity);

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
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors" aria-label="이전 달"><ChevronLeftIcon className="w-6 h-6" /></button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-center text-slate-900">{pageTitle}</h1>
                        <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors shadow-sm">오늘</button>
                    </div>
                    <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors" aria-label="다음 달"><ChevronRightIcon className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
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
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">{selectedDate}</h2>
                        <div className="space-y-4">
                            {isSummaryLoading && (
                                <div className="p-4 rounded-lg bg-slate-100 text-center text-slate-500 animate-pulse">일일 요약 생성 중...</div>
                            )}
                            {summaryError && (
                                <div className="p-4 rounded-lg bg-red-50 text-red-600 border border-red-100">
                                    <p className="font-bold">요약 오류</p><p className="text-sm mt-1">{summaryError.message}</p>
                                </div>
                            )}
                            {dailySummary && (
                                <div className="p-4 rounded-lg bg-sky-50 border border-sky-100 mb-4 shadow-sm">
                                    <h3 className="font-bold text-xl text-slate-900">{dailySummary.title}</h3>
                                    <p className="text-base text-slate-700 mt-2 whitespace-pre-line">{dailySummary.summary}</p>
                                </div>
                            )}

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
                                !areNotesLoading && !isSummaryLoading && <div className="text-center text-slate-500 p-8 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center bg-white"><CalendarIcon className="w-12 h-12 mb-4 text-slate-400" /><p>이 날짜에 노트가 없습니다.</p></div>
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
