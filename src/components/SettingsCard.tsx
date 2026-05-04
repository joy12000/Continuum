'use client';
import React from 'react';

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function SettingsCard({ title, children, className, titleClassName }: SettingsCardProps) {
  return (
    <div className={`bg-card border border-slate-700/50 p-3 rounded-xl shadow-xl ${className}`}>
      <h2 className={`text-base font-semibold text-primary pb-1 mb-2 border-b border-border ${titleClassName}`}>{title}</h2>
      <div className="text-sm">
        {children}
      </div>
    </div>
  );
}
