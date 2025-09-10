import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Toast = ({ message, type, onClose }) => {
    return (_jsxs("div", { className: `toast toast-${type}`, children: [_jsx("div", { className: "toast-message", children: message }), _jsx("button", { className: "toast-close", onClick: onClose, children: "\u00D7" })] }));
};
export default Toast;
