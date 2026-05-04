'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import CalendarMonth from '../../components/CalendarMonth';
import PageLayout from '../../components/PageLayout';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import { CalendarNoteListItem } from '../../components/CalendarNoteListItem';
import SkyCanvasAnimation from '../../components/SkyCanvasAnimation';
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
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 40) {
                setIsCompact(true);
            } else {
                setIsCompact(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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

    const pageTitle = `${year}년 ${month + 1}월`;

    return (
        <PageLayout hideBackButton={true} hideMoon={true}>
            {/* <SkyCanvasAnimation /> */}
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-surface transition-colors" aria-label="이전 달"><ChevronLeftIcon className="w-6 h-6 text-foreground" /></button>
                    <div className="flex items-center gap-4">
                        <h1 className="text-[24px] font-bold text-center tracking-tight text-foreground">{pageTitle}</h1>
                    </div>
                    <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-surface transition-colors" aria-label="다음 달"><ChevronRightIcon className="w-6 h-6 text-foreground" /></button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-white border border-border rounded-[20px] p-6 shadow-[0_1px_3px_rgba(25,31,40,0.04)]">
                        {isActivityLoading ? <div className="text-center p-8 text-muted-foreground">활동 데이터를 불러오는 중...</div> : activityError ? <div className="text-center p-8 text-destructive">오류 발생: {activityError.message}</div> : (
                            <CalendarMonth
                                year={year}
                                month={month}
                                weekLabels={WEEK_LABELS}
                                notesByDate={notesByDate}
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                isCompact={isCompact}
                            />
                        )}
                    </div>
                    <div className="lg:col-span-2">
                        <h2 className="text-[20px] font-bold text-foreground mb-4 tracking-tight">{selectedDate}</h2>
                        <div className="space-y-4">
                            {isSummaryLoading && (
                                <div className="p-[20px] rounded-[16px] bg-surface text-center text-muted animate-pulse font-medium">오늘의 인사이트를 생성하는 중...</div>
                            )}
                            {summaryError && (
                                <div className="p-[20px] rounded-[16px] bg-destructive/10 text-destructive">
                                    <p className="font-bold">요약 오류</p><p className="text-sm mt-1">{summaryError.message}</p>
                                </div>
                            )}
                            {dailySummary && (
                                <div className="p-[20px] rounded-[16px] bg-primary-soft border border-primary/20 mb-4">
                                    <h3 className="font-bold text-[18px] text-primary">{dailySummary.title}</h3>
                                    <p className="text-[15px] text-text-secondary mt-2 whitespace-pre-line leading-relaxed">{dailySummary.summary}</p>
                                </div>
                            )}

                            {areNotesLoading && <p className="text-center text-muted-foreground">노트 목록을 불러오는 중...</p>}
                            {notesError && <p className="text-center text-destructive">오류 발생: {notesError.message}</p>}
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
                                !areNotesLoading && !isSummaryLoading && <div className="text-center text-muted-foreground p-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center"><CalendarIcon className="w-12 h-12 mb-4" /><p>선택한 날짜에 기록된 노트가 없습니다.</p></div>
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
