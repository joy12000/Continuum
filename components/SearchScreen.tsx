import React from "react";
import { SearchBar } from "./SearchBar";
import { GeneratedAnswer } from "./GeneratedAnswer";
import { AnswerData } from "../types/common";
import { Note } from "../lib/db";

export default function SearchScreen({
  query, onQueryChange, suggestedQuestions, isLoadingSuggestions, suggestionError,
  generatedAnswer, notes, onNoteSelect, onSearchFocus
}:{
  query: string;
  onQueryChange: (s:string)=>void;
  suggestedQuestions?: string[];
  isLoadingSuggestions?: boolean;
  suggestionError?: string|null;
  generatedAnswer: { data: AnswerData|null; isLoading: boolean; error: string|null; };
  notes: Note[];
  onNoteSelect: (id:string)=>void;
  onSearchFocus?: ()=>void;
}){
  return (
    <div className="p-4 space-y-3">
      <h2 className="font-semibold">Search</h2>
      <SearchBar value={query} onChange={onQueryChange} onFocus={onSearchFocus}/>
      {suggestedQuestions && suggestedQuestions.length>0 && (
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((s,i)=>(
            <button key={i} className="px-2 py-1 rounded-full bg-slate-700 text-xs hover:bg-slate-600" onClick={()=>onQueryChange(s)}>{s}</button>
          ))}
        </div>
      )}
      <GeneratedAnswer data={generatedAnswer.data} isLoading={generatedAnswer.isLoading} error={generatedAnswer.error} />
      <section className="grid gap-2">
        {notes.map(n=>(
          <article key={n.id} className="rounded-xl border border-slate-700 p-3 hover:bg-slate-800 cursor-pointer" onClick={()=>onNoteSelect(n.id)}>
            <div className="text-xs text-slate-400">{new Date(n.updatedAt).toLocaleString()}</div>
            <div className="line-clamp-2" dangerouslySetInnerHTML={{__html: n.content}}/>
            <div className="mt-1 flex flex-wrap gap-1">{n.tags.map(t=>(<span key={t} className="text-xs bg-slate-700 rounded-full px-2 py-0.5">{t}</span>))}</div>
          </article>
        ))}
      </section>
    </div>
  );
}
