import React from 'react';

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({ title, children, className }: SettingsCardProps) {
  return (
    <div className={`bg-slate-800/50 p-4 rounded-lg border border-slate-700 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-300 pb-2 mb-3 border-b border-slate-700">{title}</h2>
      <div className="text-sm">
        {children}
      </div>
    </div>
  );
}
