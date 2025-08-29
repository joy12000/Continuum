import React, { useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { useSearch, SearchResult } from '../hooks/useSearch';
import PageLayout from '../components/PageLayout';

// Component to render the search results
const SearchResultsList = ({ results, loading }: { results: SearchResult[], loading: boolean }) => {
  if (loading) {
    return <div className="p-4 text-gray-400 text-center">Searching...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-gray-400 text-center">No results found.</div>;
  }

  return (
    <ul className="space-y-4">
      {results.map(result => (
        <li 
          key={result.note_id} 
          className="border border-white/10 bg-[#0b1830]/50 rounded-lg p-4 backdrop-blur-sm hover:bg-white/5 transition-colors duration-300"
        >
          <h3 
            className="text-lg font-semibold text-sky-300"
            style={{ textShadow: '0 0 0.5rem rgba(125, 211, 252, 0.3)' }}
          >
            {result.title}
          </h3>
          <div 
            className="text-sm text-gray-300 mt-2 snippet"
            dangerouslySetInnerHTML={{ __html: result.snippet_html }}
            style={{ textShadow: '0 0 0.3rem rgba(200, 220, 255, 0.2)' }}
          />
          <div className="text-xs text-gray-500 mt-2">Score: {result.score.toFixed(3)}</div>
        </li>
      ))}
    </ul>
  );
};

// Main Search Page Component
const SearchPage = () => {
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query);

  return (
    <PageLayout title="Search Notes">
      <SearchBar 
        q={query} 
        setQ={setQuery} 
        onFocus={() => {}} // Placeholder
        suggestedQuestions={[]}
        isLoadingSuggestions={false}
        suggestionError={null}
        isModelReady={true}
        modelStatus="Ready"
        // Custom styles to match the new theme
        className="bg-[#0b1830]/50 border-white/10 text-gray-200 placeholder-gray-500 focus:ring-sky-400 focus:border-sky-400"
      />
      <div className="mt-6">
        <SearchResultsList results={results} loading={loading} />
      </div>
    </PageLayout>
  );
};

export default SearchPage;
