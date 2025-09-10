import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Modal = ({ title, children, onClose, actions }) => {
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-panel", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h3", { children: title }), _jsx("button", { className: "modal-close", onClick: onClose, children: "\u00D7" })] }), _jsx("div", { className: "modal-body", children: children }), _jsx("div", { className: "modal-actions", children: actions })] }) }));
};
export default Modal;
