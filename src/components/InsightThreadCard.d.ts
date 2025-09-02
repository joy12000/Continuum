import React from 'react';
interface Note {
    id: string;
    title: string;
    body: string;
    created_at: string;
}
interface InsightThread {
    threadId: string;
    title: string;
    summary: string;
    notes: Note[];
    relevanceScore: number;
}
interface InsightThreadCardProps {
    thread: InsightThread;
}
declare const InsightThreadCard: React.FC<InsightThreadCardProps>;
export default InsightThreadCard;
//# sourceMappingURL=InsightThreadCard.d.ts.map