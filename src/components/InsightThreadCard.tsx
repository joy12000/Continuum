import React from 'react';

// OpenAPI 명세서에 정의된 Note 타입
interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

// 수정된 InsightThread 타입
interface InsightThread {
  threadId: string;
  title: string;
  summary: string;
  notes: Note[]; // noteIds: string[]에서 변경됨
  relevanceScore: number;
}

interface InsightThreadCardProps {
  thread: InsightThread;
}

// 노트 상세 페이지로 이동하는 함수 (실제 라우팅 로직에 맞게 수정 필요)
const navigateToNote = (noteId: string) => {
  // window.location.href = `/notes/${noteId}`;
  console.log(`Navigating to note: ${noteId}`);
};

const InsightThreadCard: React.FC<InsightThreadCardProps> = ({ thread }) => {
  return (
    <div className="p-4 border rounded-lg shadow-md bg-slate-800/50 border-slate-700 flex flex-col h-full">
      {/* AI 생성 제목 */}
      <h3 className="text-lg font-bold text-sky-400">{thread.title}</h3>
      
      {/* AI 생성 요약 */}
      <p className="mt-2 text-gray-300 flex-grow">{thread.summary}</p>
      
      <div className="mt-4 pt-3 border-t border-slate-700">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">포함된 노트</h4>
        {/* 포함된 노트 목록 (이제 제목을 표시) */}
        <ul className="space-y-1">
          {thread.notes.map((note) => (
            <li key={note.id}>
              <button 
                onClick={() => navigateToNote(note.id)} 
                className="text-left text-sm text-gray-300 hover:underline hover:text-white transition-colors w-full truncate"
              >
                📝 {note.title || '제목 없는 노트'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 text-xs text-right text-gray-500">
        <span>관련성 점수: {thread.relevanceScore.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default InsightThreadCard;