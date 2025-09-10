import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SettingsCard({ title, children, className, titleClassName }) {
    return (_jsxs("div", { className: `bg-card border border-border p-3 rounded-lg shadow-sm ${className}`, children: [_jsx("h2", { className: `text-base font-semibold text-primary pb-1 mb-2 border-b border-border ${titleClassName}`, children: title }), _jsx("div", { className: "text-sm", children: children })] }));
}
