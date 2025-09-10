import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
/**
 * AnswerCardsModal
 * - 그냥 그 자리에서 기존 AnswerCard/GeneratedAnswer 컴포넌트를 children으로 렌더합니다.
 * - 접근성: role="dialog", aria-modal, 포커스 트랩, ESC 닫기
 */
export default function AnswerCardsModal({ open, onClose, children }) {
    const firstRef = useRef(null);
    const cardRef = useRef(null);
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape')
                onClose();
            if (e.key === 'Tab' && cardRef.current) {
                const focusables = cardRef.current.querySelectorAll('[tabindex],button,a,textarea,input,select');
                if (focusables.length >= 2) {
                    const first = focusables[0], last = focusables[focusables.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        last.focus();
                        e.preventDefault();
                    }
                    else if (!e.shiftKey && document.activeElement === last) {
                        first.focus();
                        e.preventDefault();
                    }
                }
            }
        }
        if (open) {
            document.addEventListener('keydown', onKey);
            setTimeout(() => firstRef.current?.focus(), 0);
        }
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[90]", role: "dialog", "aria-modal": "true", onClick: onClose, children: [_jsx("div", { className: "absolute inset-0 bg-slate-900/80" }), _jsxs("div", { ref: cardRef, className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(920px,94vw)]", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { ref: firstRef, onClick: onClose, className: "absolute top-0 right-0 z-10 m-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white", "aria-label": "\uB2EB\uAE30", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }), _jsx("div", { className: "max-h-[80vh] overflow-auto", children: children })] })] }));
}
