'use client';
import React, { useState, useCallback } from 'react';
import { SearchBar } from '../../components/SearchBar';
import PageLayout from '../../components/PageLayout';
import { GeneratedAnswer } from '../../components/GeneratedAnswer';
import { NoteDetailModal } from '../../components/NoteDetailModal';
import SkyCanvasAnimation from '../../components/SkyCanvasAnimation';
import SearchResultsList from '../../components/SearchResultsList';
import { useSearchQuery, useSearchAnswer } from './hooks/useSearch';
import type { AnswerData } from '../../types/common';

const SearchPage = () => {
    const [query, setQuery] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>({});
    const [answerData, setAnswerData] = useState<AnswerData | null>(null);

    // Hooks
    const { data: results, isLoading: isSearchLoading, error: searchError } = useSearchQuery(searchQuery);
    const { mutate: generateAnswer, isPending: isAnswerLoading, error: answerError } = useSearchAnswer();

    const handleNoteClick = useCallback((noteId: string) => {
        setSelectedNoteId(noteId);
        setIsModalOpen(true);
    }, []);

    const handleSearch = () => {
        if (query.trim().length < 2) return;
        setSearchQuery(query);
        setAnswerData(null); // Reset answer
        setNoteTitlesMap({});

        // We need to wait for search results before generating answer.
        // However, useQuery is declarative. We can use useEffect to trigger answer generation when results change.
    };

    // Trigger answer generation when results change and searchQuery is valid
    React.useEffect(() => {
        if (results && results.length > 0 && searchQuery) {
            generateAnswer({ query: searchQuery, results }, {
                onSuccess: (data) => {
                    if (data) {
                        setAnswerData(data.answerData);
                        setNoteTitlesMap(data.noteTitlesMap);
                    }
                }
            });
        }
    }, [results, searchQuery, generateAnswer]);

    const GeneratedAnswerCard = () => (
        <div className="bg-card border border-border rounded-[20px] p-6 shadow-[0_1px_3px_rgba(25,31,40,0.04)]">
            {isAnswerLoading && <div className="p-4 text-center text-muted font-medium">AI 답변 생성 중...</div>}
            {answerError && <div className="p-4 text-center text-destructive font-medium">오류 발생: {answerError.message}</div>}
            {answerData && <GeneratedAnswer data={answerData} noteTitlesMap={noteTitlesMap} onNoteClick={handleNoteClick} />}
        </div>
    );

    return (
        <PageLayout title="노트 검색" hideBackButton={true} hideMoon={true}>
            {/* <SkyCanvasAnimation /> */}
            <div className="relative z-10">
                <SearchBar
                    q={query}
                    setQ={setQuery}
                    onSearch={handleSearch}
                    onFocus={() => { }} // Placeholder
                    suggestedQuestions={[]}
                    isLoadingSuggestions={false}
                    suggestionError={null}
                    isModelReady={true}
                    modelStatus="Ready"
                    className=""
                />
                <div className="mt-8">
                    {searchQuery.trim() !== '' ? (
                        <>
                            {/* Mobile layout: Generated answer first */}
                            <div className="lg:hidden">
                                {(answerData || isAnswerLoading || answerError) && (
                                    <div className="mb-8">
                                        <h2 className="text-[20px] font-bold mb-4 tracking-tight text-foreground">생성된 답변</h2>
                                        <GeneratedAnswerCard />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-[20px] font-bold mb-4 tracking-tight text-foreground">검색 결과</h2>
                                    <SearchResultsList results={results || []} loading={isSearchLoading} noteTitlesMap={noteTitlesMap} query={searchQuery} onNoteClick={handleNoteClick} />
                                </div>
                            </div>

                            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
                                <div className="lg:col-span-2">
                                    <h2 className="text-[20px] font-bold mb-4 tracking-tight text-foreground">검색 결과</h2>
                                    <SearchResultsList results={results || []} loading={isSearchLoading} noteTitlesMap={noteTitlesMap} query={searchQuery} onNoteClick={handleNoteClick} />
                                </div>
                                <div className="lg:col-span-1">
                                    <h2 className="text-[20px] font-bold mb-4 tracking-tight text-foreground">생성된 답변</h2>
                                    <GeneratedAnswerCard />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-12 text-secondary-text mt-12">
                            <h2 className="text-[24px] font-bold mb-3 tracking-tight text-foreground">무엇을 찾으시나요?</h2>
                            <p className="font-medium">과거의 기록에서 새로운 조각을 발견할 수 있습니다.</p>
                        </div>
                    )}
                </div>
            </div>
            {selectedNoteId && <NoteDetailModal noteId={selectedNoteId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </PageLayout>
    );
};

export default SearchPage;
