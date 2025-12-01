import React from 'react';

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function SettingsCard({ title, children, className, titleClassName }: SettingsCardProps) {
  return (
    <div className={`bg-white border border-slate-200 p-4 rounded-2xl shadow-sm ${className}`}>
      <h2 className={`text-base font-semibold text-slate-900 pb-2 mb-3 border-b border-slate-100 ${titleClassName}`}>{title}</h2>
      <div className="text-sm text-slate-700">
        {children}
      </div>
    </div>
  );
}
