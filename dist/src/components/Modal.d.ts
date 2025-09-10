import React from 'react';
interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    actions: React.ReactNode;
}
declare const Modal: React.FC<ModalProps>;
export default Modal;
//# sourceMappingURL=Modal.d.ts.map