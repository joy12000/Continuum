import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline';

import PageLayout from '../../components/PageLayout';
import InsightThreadCard from '../../components/InsightThreadCard';
import GenerationProgress from '../../components/GenerationProgress';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import Switch from '../../components/Switch';

import { useCachedThreads } from './hooks/useLinks';
import { useJobStatus } from './hooks/useJobStatus';
import { startGenerationJob } from './services/linkService';
import type { Note } from '@lib/types';

// --- Time Formatting Helper ---
const formatTimeAgo = (dateString: string | null): string => {
    if (!dateString) return '해당 없음';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}초 전`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
};

const LinksPage = () => {
    const queryClient = useQueryClient();
    const [jobId, setJobId] = useState<string | null>(localStorage.getItem('momentum_job_id'));
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [excludeSingletons, setExcludeSingletons] = useState<boolean>(true);
    const [expandedCardId, setExpandedCardId] = useState<string | number | null>(null);

    const parentRef = React.useRef<HTMLDivElement>(null);

    const handleNoteClick = useCallback((note: Note) => {
        setSelectedNoteId(note.id);
        setModalOpen(true);
    }, []);

    const { data: cachedData, error: queryError, isLoading: isLoadingInitial } = useCachedThreads();

    const threads = cachedData?.threads ?? [];

    const rowVirtualizer = useVirtualizer({
        count: Math.ceil(threads.length / 2),
        getScrollElement: () => parentRef.current,
        estimateSize: useCallback((index: number) => {
            const firstThread = threads[index * 2];
            const secondThread = threads[index * 2 + 1];
            const isFirstExpanded = firstThread && expandedCardId === firstThread.threadId;
            const isSecondExpanded = secondThread && expandedCardId === secondThread.threadId;

            if (isFirstExpanded || isSecondExpanded) {
                return 600;
            }
            return 350;
        }, [expandedCardId, threads]),
        overscan: 5,
    });

    const handleToggleExpand = useCallback((threadId: string | number) => {
        setExpandedCardId(prevId => {
            const newId = prevId === threadId ? null : threadId;
            setTimeout(() => {
                rowVirtualizer.measure();
            }, 100);
            return newId;
        });
    }, [rowVirtualizer]);

    const handleJobSuccess = () => {
        console.log("Job completed successfully!");
        alert("인사이트 스레드 분석 완료!");
        localStorage.removeItem('momentum_job_id');
        setJobId(null);
        queryClient.invalidateQueries({ queryKey: ['cachedThreads'] });
    };

    const handleJobError = (error: string) => {
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
        } catch (error: any) {
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
            return <GenerationProgress />;
        }

        if (isLoadingInitial) {
            return <div className="flex items-center justify-center h-full text-slate-500 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">캐시된 데이터 확인 중...</div>;
        }

        if (queryError) {
            return <div className="flex items-center justify-center h-full text-red-600 bg-white border border-red-100 rounded-2xl p-8 shadow-sm">오류: {queryError.message}</div>;
        }

        if (threads.length === 0) {
            return (
                <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md mx-auto">
                    <BeakerIcon className="w-16 h-16 mx-auto text-sky-500 mb-4" />
                    <h3 className="text-xl font-bold mb-4 text-slate-900">아직 연결된 생각 없음</h3>
                    <p className="text-slate-500 mb-6">노트를 분석하여 새로운 인사이트를 발견하세요.</p>
                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={handleGenerateClick}
                            className="px-6 py-3 font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors disabled:bg-slate-200"
                        >
                            생각 연결하기
                        </button>
                        <Switch
                            id="exclude-singletons-initial"
                            checked={excludeSingletons}
                            onChange={setExcludeSingletons}
                            label="단일 노트 스레드 제외"
                        />
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <span className="text-sm text-slate-500 text-center sm:text-left">
                        마지막 분석: {formatTimeAgo(cachedData?.lastUpdatedAt ?? null)}
                    </span>
                    <div className="flex items-center gap-4">
                        <Switch
                            id="exclude-singletons"
                            checked={excludeSingletons}
                            onChange={setExcludeSingletons}
                            label="단일 노트 제외"
                        />
                        <button
                            onClick={handleGenerateClick}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:bg-slate-200 transition-colors"
                        >
                            <CpuChipIcon className="w-5 h-5" />
                            다시 분석
                        </button>
                    </div>
                </div>
                <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-y-auto">
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const firstThreadIndex = virtualRow.index * 2;
                            const secondThreadIndex = firstThreadIndex + 1;
                            const firstThread = threads[firstThreadIndex];
                            const secondThread = threads[secondThreadIndex];

                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                                >
                                    {firstThread && (
                                        <InsightThreadCard
                                            thread={firstThread}
                                            onNoteClick={handleNoteClick}
                                            isExpanded={expandedCardId === firstThread.threadId}
                                            onToggleExpand={handleToggleExpand}
                                        />
                                    )}
                                    {secondThread && (
                                        <InsightThreadCard
                                            thread={secondThread}
                                            onNoteClick={handleNoteClick}
                                            isExpanded={expandedCardId === secondThread.threadId}
                                            onToggleExpand={handleToggleExpand}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PageLayout title="인사이트 스레드" transparent hideBackButton={true}>
            <div className="relative z-10">
                {renderContent()}
            </div>
            {selectedNoteId && <NoteDetailModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                noteId={selectedNoteId}
            />}
        </PageLayout>
    );
};

export default LinksPage;
