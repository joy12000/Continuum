import React from 'react';

// 부모 컴포넌트로부터 전달받을 데이터의 타입 정의
interface InsightThread {
  threadId: string;
  title: string;
  summary: string;
  noteIds: string[];
  relevanceScore: number;
}

interface InsightThreadCardProps {
  thread: InsightThread;
  // 노트 전체 목록을 받아 노트 제목을 찾기 위해 추가할 수 있습니다.
  // allNotes: Note[]; 
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
        {/* 포함된 노트 목록 */}
        <ul className="space-y-1">
          {thread.noteIds.map((noteId) => (
            <li key={noteId}>
              <button 
                onClick={() => navigateToNote(noteId)} 
                className="text-left text-sm text-gray-300 hover:underline hover:text-white transition-colors w-full truncate"
              >
                {/* 우선 노트 ID를 표시합니다. 향후 노트 제목으로 대체 필요. */}
                📝 Note: {noteId}
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
