import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import InsightThreadCard from '@/components/InsightThreadCard';
import GenerationProgress from '@/components/GenerationProgress';
import { NoteDetailModal } from '@/components/NoteDetailModal';
import { useJobStatus } from '@/hooks/useJobStatus';
import { supabase } from '@/lib/supabase';
import { BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline';
// --- Time Formatting Helper ---
const formatTimeAgo = (dateString) => {
    if (!dateString)
        return '해당 없음';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60)
        return `${seconds}초 전`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
};
// --- API Call Functions ---
const fetchCachedThreads = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch('/api/v1?action=get-threads', {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!response.ok) {
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return { threads: [], lastUpdatedAt: null };
        }
        throw new Error(`HTTP 오류! 상태: ${response.status}`);
    }
    return response.json();
};
const startGenerationJob = async (excludeSingletons) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch('/api/v1?action=generate-thread', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ excludeSingletons })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "알 수 없는 오류가 발생했습니다." }));
        throw new Error(errorData.message || `HTTP 오류! 상태: ${response.status}`);
    }
    return response.json();
};
const LinksPage = ({ session }) => {
    const queryClient = useQueryClient();
    const [jobId, setJobId] = useState(localStorage.getItem('momentum_job_id'));
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [excludeSingletons, setExcludeSingletons] = useState(true);
    const handleNoteClick = useCallback((note) => {
        setSelectedNoteId(note.id);
        setModalOpen(true);
    }, []);
    const { data: cachedData, error: queryError, isLoading: isLoadingInitial } = useQuery({
        queryKey: ['cachedThreads'],
        queryFn: fetchCachedThreads,
        enabled: !!session,
    });
    const handleJobSuccess = () => {
        console.log("Job completed successfully!");
        alert("인사이트 스레드 분석 완료!");
        localStorage.removeItem('momentum_job_id');
        setJobId(null);
        queryClient.invalidateQueries({ queryKey: ['cachedThreads'] });
    };
    const handleJobError = (error) => {
        console.error("Job failed:", error);
        alert(`오류가 발생했습니다: ${error}`);
        localStorage.removeItem('momentum_job_id');
        setJobId(null);
    };
    const jobStatus = useJobStatus({
        jobId,
        onSuccess: handleJobSuccess,
        onError: handleJobError,
    });
    const handleGenerateClick = async () => {
        try {
            const data = await startGenerationJob(excludeSingletons);
            localStorage.setItem('momentum_job_id', data.jobId);
            setJobId(data.jobId);
        }
        catch (error) {
            alert(`분석 시작 실패: ${error.message}`);
        }
    };
    useEffect(() => {
        const runningJobId = localStorage.getItem('momentum_job_id');
        if (runningJobId) {
            setJobId(runningJobId);
        }
    }, []);
    const renderContent = () => {
        if (jobStatus === 'pending' || jobStatus === 'processing') {
            return _jsx(GenerationProgress, {});
        }
        if (isLoadingInitial) {
            return _jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-8", children: "\uCE90\uC2DC\uB41C \uB370\uC774\uD130 \uD655\uC778 \uC911..." });
        }
        if (queryError) {
            return _jsxs("div", { className: "flex items-center justify-center h-full text-destructive bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-8", children: ["\uC624\uB958: ", queryError.message] });
        }
        const threads = cachedData?.threads;
        if (!threads || threads.length === 0) {
            return (_jsxs("div", { className: "text-center p-8 bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg shadow-lg max-w-md mx-auto", children: [_jsx(BeakerIcon, { className: "w-16 h-16 mx-auto text-accent mb-4" }), _jsx("h3", { className: "text-xl font-bold mb-4", children: "\uC544\uC9C1 \uC5F0\uACB0\uB41C \uC0DD\uAC01 \uC5C6\uC74C" }), _jsx("p", { className: "text-muted-foreground mb-6", children: "\uB178\uD2B8\uB97C \uBD84\uC11D\uD558\uC5EC \uC0C8\uB85C\uC6B4 \uC778\uC0AC\uC774\uD2B8\uB97C \uBC1C\uACAC\uD558\uC138\uC694." }), _jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsx("button", { onClick: handleGenerateClick, className: "px-6 py-3 font-bold text-white bg-accent rounded-lg hover:bg-accent/80 transition-colors disabled:bg-muted", children: "\uC0DD\uAC01 \uC5F0\uACB0\uD558\uAE30" }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "exclude-singletons-initial", checked: excludeSingletons, onChange: (e) => setExcludeSingletons(e.target.checked), className: "h-4 w-4 rounded border-border text-accent focus:ring-accent" }), _jsx("label", { htmlFor: "exclude-singletons-initial", className: "ml-2 text-sm text-muted-foreground", children: "\uB2E8\uC77C \uB178\uD2B8 \uC2A4\uB808\uB4DC \uC81C\uC678" })] })] })] }));
        }
        return (_jsxs("div", { children: [_jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-center mb-6 gap-4", children: [_jsxs("span", { className: "text-sm text-muted-foreground text-center sm:text-left", children: ["\uB9C8\uC9C0\uB9C9 \uBD84\uC11D: ", formatTimeAgo(cachedData.lastUpdatedAt)] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "exclude-singletons", checked: excludeSingletons, onChange: (e) => setExcludeSingletons(e.target.checked), className: "h-4 w-4 rounded border-border text-accent focus:ring-accent" }), _jsx("label", { htmlFor: "exclude-singletons", className: "ml-2 text-sm text-muted-foreground", children: "\uB2E8\uC77C \uB178\uD2B8 \uC81C\uC678" })] }), _jsxs("button", { onClick: handleGenerateClick, className: "flex items-center gap-2 px-4 py-2 text-sm font-bold text-accent-foreground bg-accent/80 rounded-lg hover:bg-accent disabled:bg-muted transition-colors", children: [_jsx(CpuChipIcon, { className: "w-5 h-5" }), "\uB2E4\uC2DC \uBD84\uC11D"] })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: threads.map((thread) => (_jsx(InsightThreadCard, { thread: thread, onNoteClick: handleNoteClick }, thread.threadId))) })] }));
    };
    return (_jsxs(PageLayout, { title: "\uC778\uC0AC\uC774\uD2B8 \uC2A4\uB808\uB4DC", transparent: true, fullWidth: true, className: "bg-links-background", hideMoon: true, hideBackButton: true, children: [_jsx("div", { className: "relative z-10", children: renderContent() }), selectedNoteId && _jsx(NoteDetailModal, { isOpen: isModalOpen, onClose: () => setModalOpen(false), noteId: selectedNoteId })] }));
};
export default LinksPage;
