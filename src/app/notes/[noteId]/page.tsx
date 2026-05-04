import React from 'react';
import NoteDetailPage from '@/features/notes/NoteDetailPage';

export default function Page({ params }: { params: { noteId: string } }) {
  // In Next.js App Router, params is an object
  // Note: For client components, we might need to use useSearchParams or useParams
  // But since we are wrapping a component that likely expects react-router-dom params...
  // We may need to provide the noteId manually.
  return <NoteDetailPage />;
}
