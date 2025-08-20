import { marked } from "marked";
import { useMemo, useState, useEffect } from "react";
import { db } from "../store/db";
import type { Note } from "../store/db";

export type AnswerSentence = {
  sentence: string;
  sourceNoteId: string;
};

export type GeneratedAnswerType = {
  answer: AnswerSentence[];
};

const NoteCard = ({ note, onClick, isSelected }: { note: Note; onClick: () => void; isSelected: boolean }) => {
  const title = note.content.split('\n')[0] || "Untitled Note";
  const snippet = note.content.substring(0, 100) + (note.content.length > 100 ? "..." : "");

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-primary text-primary-content shadow-lg' : 'bg-base-100 hover:bg-base-300'}`}
      onClick={onClick}
    >
      <h4 className="font-semibold truncate">{title}</h4>
      <p className="text-sm opacity-80">{snippet}</p>
    </div>
  );
};

export const GeneratedAnswer = ({
  answer,
  isGenerating,
  error,
  onRetry,
}: {
  answer: GeneratedAnswerType | null;
  isGenerating: boolean;
  error: any;
  onRetry: () => void;
}) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sourceNotes, setSourceNotes] = useState<Note[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  const uniqueSourceIds = useMemo(() => {
    if (!answer?.answer) return [];
    return [...new Set(answer.answer.map((a) => a.sourceNoteId))];
  }, [answer]);

  useEffect(() => {
    const fetchSourceNotes = async () => {
      if (uniqueSourceIds.length === 0) {
        setSourceNotes([]);
        return;
      }
      setIsLoadingSources(true);
      try {
        const notes = await db.notes.bulkGet(uniqueSourceIds);
        setSourceNotes(notes.filter((n): n is Note => !!n));
      } catch (err) {
        console.error("Failed to fetch source notes:", err);
      } finally {
        setIsLoadingSources(false);
      }
    };
    fetchSourceNotes();
  }, [uniqueSourceIds]);

  const sourceMap = useMemo(() => {
    return new Map(uniqueSourceIds.map((id, index) => [id, index + 1]));
  }, [uniqueSourceIds]);

  const handleSourceClick = (note: Note) => {
    setSelectedNote(note);
  };

  const selectedNoteHtml = useMemo(() => {
    if (!selectedNote?.content) return "";
    return marked.parse(selectedNote.content);
  }, [selectedNote]);

  return (
    <div className="p-4 bg-base-200 rounded-lg shadow-md space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Answer</h2>
      </div>

      {isGenerating && !answer && <div className="text-center p-4"><span className="loading loading-dots loading-lg"></span></div>}
      {error && (
        <div className="text-error text-center">
          <p>An error occurred: {error.message || "Unknown error"}</p>
          <button className="btn btn-sm btn-error mt-2" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {answer && (
        <div className="prose prose-sm max-w-none">
          {answer.answer.map((item, index) => (
            <span key={index}>
              {item.sentence}{ ""}
              <a
                onClick={() => {
                  const note = sourceNotes.find(n => n.id === item.sourceNoteId);
                  if (note) handleSourceClick(note);
                }}
                className="link link-primary no-underline font-bold cursor-pointer"
                title={`Source [${sourceMap.get(item.sourceNoteId)}]`}
              >
                [{sourceMap.get(item.sourceNoteId)}]
              </a>{" "}
            </span>
          ))}
        </div>
      )}

      {isLoadingSources && <div className="text-center"><span className="loading loading-spinner"></span></div>}

      {sourceNotes.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="font-semibold">Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sourceNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => handleSourceClick(note)}
                isSelected={selectedNote?.id === note.id}
              />
            ))}
          </div>
        </div>
      )}

      {selectedNote && (
        <div className="pt-4">
          <h3 className="font-semibold mb-2">Selected Source: {selectedNote.content.split('\n')[0]}</h3>
          <div
            className="prose prose-sm max-w-none bg-base-100 p-4 rounded-lg"
            dangerouslySetInnerHTML={{ __html: selectedNoteHtml }}
          />
        </div>
      )}
    </div>
  );
};
