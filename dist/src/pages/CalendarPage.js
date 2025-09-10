import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import CalendarMonth from '../components/CalendarMonth';
import { supabase } from '../lib/supabase';
import PageLayout from '../components/PageLayout';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { NoteDetailModal } from '../components/NoteDetailModal';
import SkyCanvasAnimation from '../components/SkyCanvasAnimation';
const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function ymd(d) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
}
// API 호출 함수: 특정 날짜의 노트 목록 가져오기
const fetchNotesForDate = async (date) => {
    if (!date)
        return [];
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token)
        throw new Error('인증이 필요합니다.');
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
const fetchDailySummary = async (notes) => {
    if (!notes || notes.length === 0) {
        return null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token)
        throw new Error('인증이 필요합니다.');
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
        throw new Error(errorData.error || '일일 요약을 생성하는데 실패했습니다.');
    }
    return response.json();
};
// API 호출 함수: 월별 노트 활동(개수) 가져오기
const fetchNoteActivity = async (startDate, endDate) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token)
        throw new Error('인증이 필요합니다.');
    const response = await fetch(`/api/v1?action=calendar&start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '노트 활동을 불러오는데 실패했습니다.');
    }
    return response.json();
};
const CalendarPage = ({ session }) => {
    const [selectedDate, setSelectedDate] = useState(ymd(new Date()));
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const handleNoteClick = (noteId) => {
        setSelectedNoteId(noteId);
        setIsModalOpen(true);
    };
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth(); // 0-indexed
    const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const { data: activityData, isLoading: isActivityLoading, error: activityError } = useQuery({
        queryKey: ['noteActivity', year, month],
        queryFn: () => fetchNoteActivity(firstDayOfMonth, lastDayOfMonth),
        enabled: !!session,
    });
    const { data: notesForSelectedDay, isLoading: areNotesLoading, error: notesError } = useQuery({
        queryKey: ['notesForDate', selectedDate],
        queryFn: () => fetchNotesForDate(selectedDate),
        enabled: !!selectedDate && !!session,
    });
    const { data: dailySummary, isLoading: isSummaryLoading, error: summaryError } = useQuery({
        queryKey: ['dailySummary', selectedDate],
        queryFn: () => fetchDailySummary(notesForSelectedDay),
        enabled: !!notesForSelectedDay && notesForSelectedDay.length > 0 && !!session,
    });
    const notesByDate = useMemo(() => {
        const map = {};
        if (activityData) {
            for (const activity of activityData) {
                map[activity.activity_date] = Array.from({ length: activity.count }, () => ({}));
            }
        }
        return map;
    }, [activityData]);
    const handleMonthChange = (offset) => {
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
    return (_jsxs(PageLayout, { title: "\uCE98\uB9B0\uB354", hideBackButton: true, children: [_jsx(SkyCanvasAnimation, {}), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("button", { onClick: () => handleMonthChange(-1), className: "p-2 rounded-full hover:bg-secondary transition-colors", "aria-label": "\uC774\uC804 \uB2EC", children: _jsx(ChevronLeftIcon, { className: "w-6 h-6" }) }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("h1", { className: "text-2xl font-bold text-center", children: pageTitle }), _jsx("button", { onClick: goToToday, className: "px-4 py-2 text-sm font-medium text-primary-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors", children: "\uC624\uB298" })] }), _jsx("button", { onClick: () => handleMonthChange(1), className: "p-2 rounded-full hover:bg-secondary transition-colors", "aria-label": "\uB2E4\uC74C \uB2EC", children: _jsx(ChevronRightIcon, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-8", children: [_jsx("div", { className: "lg:col-span-3 bg-card border border-border rounded-lg p-4 shadow-lg", children: isActivityLoading ? _jsx("div", { className: "text-center p-8 text-muted-foreground", children: "\uCE98\uB9B0\uB354 \uB85C\uB529 \uC911..." }) : activityError ? _jsxs("div", { className: "text-center p-8 text-destructive", children: ["\uC624\uB958: ", activityError.message] }) : (_jsx(CalendarMonth, { year: year, month: month, weekLabels: WEEK_LABELS, notesByDate: notesByDate, selectedDate: selectedDate, onSelectDate: setSelectedDate })) }), _jsxs("div", { className: "lg:col-span-2", children: [_jsx("h2", { className: "text-xl font-semibold text-primary mb-4", children: selectedDate }), _jsxs("div", { className: "space-y-4", children: [isSummaryLoading && (_jsx("div", { className: "p-4 rounded-lg bg-secondary text-center text-muted-foreground animate-pulse", children: "\uC77C\uC77C \uC694\uC57D \uC0DD\uC131 \uC911..." })), summaryError && (_jsxs("div", { className: "p-4 rounded-lg bg-destructive/20 text-destructive", children: [_jsx("p", { className: "font-bold", children: "\uC694\uC57D \uC624\uB958" }), _jsx("p", { className: "text-sm mt-1", children: summaryError.message })] })), dailySummary && (_jsxs("div", { className: "p-4 rounded-lg bg-accent/20 border border-accent/50 mb-4", children: [_jsx("h3", { className: "font-bold text-lg text-accent", children: dailySummary.title }), _jsx("p", { className: "text-sm text-muted-foreground mt-2 whitespace-pre-line", children: dailySummary.summary })] })), areNotesLoading && _jsx("p", { className: "text-center text-muted-foreground", children: "\uB178\uD2B8 \uB85C\uB529 \uC911..." }), notesError && _jsxs("p", { className: "text-center text-destructive", children: ["\uC624\uB958: ", notesError.message] }), notesForSelectedDay && notesForSelectedDay.length > 0 ? (_jsx("ul", { className: "space-y-3", children: notesForSelectedDay.map(note => (_jsx("li", { children: _jsxs("button", { onClick: () => handleNoteClick(note.id), className: "block w-full text-left p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors duration-200", children: [_jsx("h3", { className: "font-semibold text-primary truncate", children: note.title || '제목 없는 노트' }), _jsx("p", { className: "text-sm text-muted-foreground line-clamp-2 mt-1", children: note.body }), _jsx("div", { className: "text-xs text-muted-foreground/80 mt-2 text-right", children: new Date(note.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) })] }) }, note.id))) })) : (!areNotesLoading && !isSummaryLoading && _jsxs("div", { className: "text-center text-muted-foreground p-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center", children: [_jsx(CalendarIcon, { className: "w-12 h-12 mb-4" }), _jsx("p", { children: "\uC774 \uB0A0\uC9DC\uC5D0 \uB178\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })] }))] })] })] })] }), selectedNoteId && _jsx(NoteDetailModal, { noteId: selectedNoteId, isOpen: isModalOpen, onClose: () => setIsModalOpen(false) })] }));
};
export default CalendarPage;
