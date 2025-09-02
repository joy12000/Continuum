import React from 'react';
/**
 * AnswerCardsModal
 * - 그냥 그 자리에서 기존 AnswerCard/GeneratedAnswer 컴포넌트를 children으로 렌더합니다.
 * - 접근성: role="dialog", aria-modal, 포커스 트랩, ESC 닫기
 */
export default function AnswerCardsModal({ open, onClose, children }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=AnswerCardsModal.d.ts.map