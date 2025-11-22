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
        <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-4 shadow-lg">
            {isAnswerLoading && <div className="p-4 text-center text-muted-foreground">답변 생성 중...</div>}
            {answerError && <div className="p-4 text-center text-destructive">오류: {answerError.message}</div>}
            {answerData && <GeneratedAnswer data={answerData} noteTitlesMap={noteTitlesMap} onNoteClick={handleNoteClick} />}
        </div>
    );

    return (
        <PageLayout title="노트 검색" hideBackButton={true}>
            <SkyCanvasAnimation />
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
                    className="bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 text-primary placeholder-muted-foreground focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/80"
                />
                <div className="mt-6">
                    {searchQuery.trim() !== '' ? (
                        <>
                            {/* Mobile layout: Generated answer first */}
                            <div className="lg:hidden">
                                {(answerData || isAnswerLoading || answerError) && (
                                    <div className="mb-6">
                                        <h2 className="text-xl font-semibold mb-4">생성된 답변</h2>
                                        <GeneratedAnswerCard />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4">검색 결과</h2>
                                    <SearchResultsList results={results || []} loading={isSearchLoading} noteTitlesMap={noteTitlesMap} query={searchQuery} onNoteClick={handleNoteClick} />
                                </div>
                            </div>

                            {/* Desktop layout: Two columns */}
                            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
                                <div className="lg:col-span-2">
                                    <h2 className="text-xl font-semibold mb-4">검색 결과</h2>
                                    <SearchResultsList results={results || []} loading={isSearchLoading} noteTitlesMap={noteTitlesMap} query={searchQuery} onNoteClick={handleNoteClick} />
                                </div>
                                <div className="lg:col-span-1">
                                    <h2 className="text-xl font-semibold mb-4">생성된 답변</h2>
                                    <GeneratedAnswerCard />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-12 text-muted-foreground">
                            <h2 className="text-2xl font-semibold mb-2">무엇이든 물어보세요.</h2>
                            <p>당신의 기억 속에서 답을 찾아드립니다.</p>
                        </div>
                    )}
                </div>
            </div>
            {selectedNoteId && <NoteDetailModal noteId={selectedNoteId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
        </PageLayout>
    );
};

export default SearchPage;
