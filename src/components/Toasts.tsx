
import React, { useState, useEffect } from 'react';
import { subscribe } from '../lib/toast';
import Toast from './Toast';

export function Toasts() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe(setToasts);
    return () => unsubscribe();
  }, []);

  return (
    <div className="toasts-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.text}
          type={toast.type}
          onClose={() => {}}
        />
      ))}
    </div>
  );
}
