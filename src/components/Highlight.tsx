import React from 'react';

interface HighlightProps {
  text: string;
  query: string;
}

const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
  if (!query) {
    return <span>{text}</span>;
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) => (
        <span
          key={i}
          style={part.toLowerCase() === query.toLowerCase() ? { backgroundColor: 'yellow', color: 'black' } : {}}
        >
          {part}
        </span>
      ))}
    </span>
  );
};

export default Highlight;
