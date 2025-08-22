import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A reusable confirmation modal component.
 * @param {ConfirmModalProps} props - The props for the component.
 * @returns {React.ReactElement | null} The rendered modal or null if not open.
 */
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) {
        return null;
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: title }), _jsx("p", { className: "text-gray-700 mb-6", children: message }), _jsxs("div", { className: "flex justify-end space-x-4", children: [_jsx("button", { onClick: onCancel, className: "px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400", children: "Cancel" }), _jsx("button", { onClick: onConfirm, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500", children: "Confirm" })] })] }) }));
};
export default ConfirmModal;
