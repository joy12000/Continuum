import React from "react";

type View = 'today' | 'notes' | 'recall' | 'search' | 'settings';

export default function TabBar({ view, onChange }:{ view: View; onChange: (v:View)=>void; }){
  const tabs: {key:View; label:string}[] = [
    { key: 'today', label: 'Today' },
    { key: 'notes', label: 'Notes' },
    { key: 'recall', label: 'Recall' },
    { key: 'search', label: 'Search' },
    { key: 'settings', label: 'Settings' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 border-t border-slate-700 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <div className="max-w-3xl mx-auto grid grid-cols-5">
        {tabs.map(t=>(
          <button key={t.key} className={"py-2 text-sm " + (view===t.key ? "text-white" : "text-slate-400")} onClick={()=>onChange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
