import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Moon from './Moon';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
const PageLayout = ({ children, title, transparent, fullWidth, className, hideMoon, hideBackButton }) => {
    const navigate = useNavigate();
    const layoutClasses = `relative min-h-screen text-foreground font-sans ${transparent ? '' : ''} ${className || ''}`;
    const contentWrapperClasses = fullWidth
        ? "w-full px-4 py-8"
        : "w-full md:max-w-3xl mx-auto px-4 py-8";
    return (_jsxs("div", { className: layoutClasses, children: [!hideMoon && _jsx(Moon, { onClick: () => navigate('/settings') }), _jsxs("div", { className: contentWrapperClasses, children: [title && (_jsxs("div", { className: "relative text-center mb-6", children: [!hideBackButton &&
                                _jsx("button", { onClick: () => navigate(-1), className: "absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800 transition-colors", "aria-label": "Go back", children: _jsx(ArrowLeft, { size: 24, className: "text-gray-200" }) }), _jsx("h1", { className: "text-3xl font-bold text-gray-200 text-shadow-glow inline-block", children: title })] })), children] })] }));
};
export default PageLayout;
