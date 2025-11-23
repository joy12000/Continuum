export const CHAT_BUNDLE_EVENT = 'chat:bundle-save';
export const CHAT_SUMMARY_EVENT = 'chat:bundle-summary';

export interface ChatSummaryEventDetail {
  summary: string;
  noteId: string;
  createdAt?: number;
}
