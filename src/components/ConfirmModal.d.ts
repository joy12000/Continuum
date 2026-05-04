import React from 'react';
type Props = {
    title?: string;
    children: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose: () => void;
};
export default function ConfirmModal({ title, children, confirmText, cancelText, onConfirm, onClose, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ConfirmModal.d.ts.map
