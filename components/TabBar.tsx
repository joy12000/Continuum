import React from "react";
import { createPortal } from "react-dom";

type View = 'today' | 'settings' | 'diagnostics';

export default function TabBar({ view, onChange }:{ view: View; onChange: (v:View)=>void; }){
  const tabs: {key:View; label:string}[] = [
    { key: 'today', label: 'Today' },
    { key: 'settings', label: 'Settings' },
    { key: 'diagnostics', label: 'Diag' },
  ];

  const bar = (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/80 border-t border-slate-700 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto grid grid-cols-3">
        {tabs.map(t => (
          <button
            key={t.key}
            className={"py-2 text-sm " + (view===t.key ? "text-white font-semibold" : "text-slate-400")}
            onClick={()=>onChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );

  // Always render into <body> so it's not clipped by any parent layout
  return (typeof document !== 'undefined') ? createPortal(bar, document.body) : bar;
}
