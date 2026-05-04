'use client';
import React from 'react';

interface HighlightProps {
  text: string;
  query: string;
}

const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
  if (!query) return <>{text}</>;

  const lowerCaseText = text.toLowerCase();
  const lowerCaseQuery = query.toLowerCase();
  
  const parts = [];
  let lastIndex = 0;
  let index = lowerCaseText.indexOf(lowerCaseQuery, lastIndex);

  while (index !== -1) {
    parts.push(text.substring(lastIndex, index));
    parts.push(
      <mark key={index} className="bg-accent text-accent-foreground rounded px-1">
        {text.substring(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
    index = lowerCaseText.indexOf(lowerCaseQuery, lastIndex);
  }

  parts.push(text.substring(lastIndex));

  return <>{parts}</>;
};

export default Highlight;
