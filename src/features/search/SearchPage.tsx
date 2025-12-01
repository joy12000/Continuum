import React, { useState, useCallback } from 'react';
import { SearchBar } from '../../components/SearchBar';
import PageLayout from '../../components/PageLayout';
import { GeneratedAnswer } from '../../components/GeneratedAnswer';
import { NoteDetailModal } from '../../components/NoteDetailModal';
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
    const { data: searchResponse, isLoading: isSearchLoading, error: searchError } = useSearchQuery(searchQuery);
    const searchResults = searchResponse?.results || [];
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
        if (searchResults && searchResults.length > 0 && searchQuery) {
            generateAnswer({ query: searchQuery, results: searchResults }, {
                onSuccess: (data) => {
                    if (data) {
                        setAnswerData(data.answerData);
                        setNoteTitlesMap(data.noteTitlesMap);
                    }
                }
            });
        }
    }, [searchResults, searchQuery, generateAnswer]);

    const GeneratedAnswerCard = () => (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            {isAnswerLoading && <div className="p-4 text-center text-slate-500">답변 생성 중...</div>}
            {answerError && <div className="p-4 text-center text-red-600">오류: {answerError.message}</div>}
            {answerData && <GeneratedAnswer data={answerData} noteTitlesMap={noteTitlesMap} onNoteClick={handleNoteClick} />}
        </div>
    );

    return (
        <PageLayout title="노트 검색" hideBackButton={true}>
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
                    className="border border-slate-200"
                />
                <div className="mt-6">
                    {searchQuery.trim() !== '' ? (
                        <>
                            {/* Mobile layout: Generated answer first */}
                            <div className="lg:hidden">
                                {(answerData || isAnswerLoading || answerError) && (
                                    <div className="mb-6">
                                        <h2 className="text-xl font-semibold mb-4 text-slate-900">생성된 답변</h2>
                                        <GeneratedAnswerCard />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 text-slate-900">검색 결과</h2>
                                    <SearchResultsList results={searchResults} loading={isSearchLoading} noteTitlesMap={noteTitlesMap} query={searchQuery} onNoteClick={handleNoteClick} />
                                </div>
                            </div>

                            {/* Desktop layout: Two columns */}
                            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
                                <div className="lg:col-span-2">
                                    <h2 className="text-xl font-semibold mb-4 text-slate-900">검색 결과</h2>
                                    <SearchResultsList results={searchResults} loading={isSearchLoading} noteTitlesMap={noteTitlesMap} query={searchQuery} onNoteClick={handleNoteClick} />
                                </div>
                                <div className="lg:col-span-1">
                                    <h2 className="text-xl font-semibold mb-4 text-slate-900">생성된 답변</h2>
                                    <GeneratedAnswerCard />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-12 text-slate-500">
                            <h2 className="text-2xl font-semibold mb-2 text-slate-900">무엇이든 물어보세요.</h2>
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
