import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation, useNavigate } from 'react-router-dom';
const TABS = [
    { to: '/', icon: 'home', label: '홈' },
    { to: '/calendar', icon: 'calendar', label: '캘린더' },
    { to: '/search', icon: 'search', label: '검색' },
    { to: '/threads', icon: 'link', label: '스레드' },
];
export default function NewBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    return (_jsx("nav", { className: "pointer-events-auto fixed inset-x-0 bottom-0 z-20 mx-auto mb-2 flex h-12 w-[min(520px,92%)] items-center justify-around\n                 rounded-full border border-white/10 bg-black/40 backdrop-blur", children: TABS.map((tab) => (_jsx(Tab, { icon: tab.icon, label: tab.label, active: location.pathname === tab.to, onClick: () => navigate(tab.to) }, tab.to))) }));
}
function Tab({ icon, label, active, onClick, }) {
    return (_jsxs("button", { onClick: onClick, className: `flex h-9 items-center gap-2 rounded-full px-3 text-sm transition-colors ${active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'}`, children: [_jsx("span", { className: "inline-block", children: getIcon(icon) }), _jsx("span", { className: "hidden sm:inline", children: label })] }));
}
function getIcon(name) {
    switch (name) {
        case 'home':
            return (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M3 11.5 12 4l9 7.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8.5Z", stroke: "currentColor", strokeWidth: "1.5" }) }));
        case 'calendar':
            return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("path", { d: "M16 3v4M8 3v4M3 10h18", stroke: "currentColor", strokeWidth: "1.5" })] }));
        case 'search':
            return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("circle", { cx: "11", cy: "11", r: "7", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("path", { d: "M20 20l-3.2-3.2", stroke: "currentColor", strokeWidth: "1.5" })] }));
        case 'link':
            return (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: [_jsx("path", { d: "M10 14l-1.5 1.5a4 4 0 1 1-5.7-5.7L4.5 8", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("path", { d: "M14 10l1.5-1.5a4 4 0 1 1 5.7 5.7L19.5 16", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("path", { d: "M8 12h8", stroke: "currentColor", strokeWidth: "1.5" })] }));
    }
}
