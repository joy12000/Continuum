// src/components/ConfirmModal.tsx
import React from 'react';

type Props = {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen, title='확인', message='이 작업을 진행할까요?',
  confirmText='확인', cancelText='취소', onConfirm, onCancel
}: Props){
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white text-black max-w-md w-full rounded-2xl p-5 shadow-2xl">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 rounded-lg border">{cancelText}</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded-lg bg-black text-white">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
