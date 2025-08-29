import React, { useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { useSearch, SearchResult } from '../hooks/useSearch';

// Component to render the search results
const SearchResultsList = ({ results, loading }: { results: SearchResult[], loading: boolean }) => {
  if (loading) {
    return <div className="p-4 text-gray-500">Searching...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-gray-500">No results found.</div>;
  }

  return (
    <ul className="space-y-4 p-4">
      {results.map(result => (
        <li key={result.note_id} className="p-4 border rounded-lg hover:bg-gray-50">
          <h3 className="text-lg font-semibold text-blue-600">{result.title}</h3>
          <div 
            className="text-sm text-gray-700 mt-2 snippet"
            dangerouslySetInnerHTML={{ __html: result.snippet_html }}
          />
          <div className="text-xs text-gray-400 mt-2">Score: {result.score.toFixed(3)}</div>
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
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Search Notes</h1>
      <SearchBar 
        q={query} 
        setQ={setQuery} 
        // Passing default/empty values for other required props to fix build
        onFocus={() => {}}
        suggestedQuestions={[]}
        isLoadingSuggestions={false}
        suggestionError={null}
        isModelReady={true}
        modelStatus="Ready"
      />
      <div className="mt-6">
        <SearchResultsList results={results} loading={loading} />
      </div>
    </div>
  );
};

export default SearchPage;