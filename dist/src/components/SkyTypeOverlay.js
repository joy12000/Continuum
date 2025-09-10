import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
export default function SkyTypeOverlay({ onTextRectChange, placeholder = '밤하늘에 적어보세요…', }) {
    const edRef = useRef(null);
    const viewRef = useRef(null);
    const composing = useRef(false);
    useEffect(() => {
        const ed = edRef.current;
        const view = viewRef.current;
        const sync = () => {
            const txt = ed.innerText;
            view.textContent = txt.length ? txt : placeholder;
            const r = view.getBoundingClientRect();
            onTextRectChange?.([{ x: r.left, y: r.top, w: r.width, h: r.height }]);
        };
        const cs = () => { composing.current = true; };
        const ce = () => { composing.current = false; sync(); };
        ed.addEventListener('input', sync);
        ed.addEventListener('compositionstart', cs);
        ed.addEventListener('compositionend', ce);
        // 초기 동기화
        sync();
        return () => {
            ed.removeEventListener('input', sync);
            ed.removeEventListener('compositionstart', cs);
            ed.removeEventListener('compositionend', ce);
        };
    }, [onTextRectChange, placeholder]);
    // 모바일 키보드 보정
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv)
            return;
        const onResize = () => {
            const overlay = viewRef.current?.parentElement;
            if (!overlay)
                return;
            overlay.style.paddingBottom = `${Math.max(0, window.innerHeight - vv.height)}px`;
        };
        vv.addEventListener('resize', onResize);
        return () => vv.removeEventListener('resize', onResize);
    }, []);
    // 자동 포커스: 사용자가 바로 타이핑할 수 있게
    useEffect(() => {
        edRef.current?.focus();
    }, []);
    return (_jsxs("div", { className: "fixed inset-0 z-[20] select-none", children: [_jsx("div", { ref: viewRef, className: "absolute left-1/2 top-[22%] -translate-x-1/2 whitespace-pre-wrap text-center\r\n                   text-[24px] md:text-[40px] font-semibold leading-relaxed\r\n                   text-transparent bg-clip-text\r\n                   [background-image:linear-gradient(180deg,rgba(255,255,255,.95),rgba(160,200,255,.75))]\r\n                   mix-blend-screen\r\n                   drop-shadow-[0_0_14px_rgba(140,180,255,.35)]", "aria-hidden": true }), _jsx("div", { ref: edRef, contentEditable: true, role: "textbox", "aria-label": "\uBC24\uD558\uB298\uC5D0 \uC801\uAE30", className: "fixed inset-0 outline-none caret-white", style: { color: 'transparent', WebkitTextFillColor: 'transparent', userSelect: 'none' }, onClick: (e) => e.stopPropagation() })] }));
}
