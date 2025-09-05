import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';
import { toast } from '../lib/toast';

interface LinkEditorModalProps {
  noteId: string;
  onClose: () => void;
  onSave: (linksToAdd: string[], linksToRemove: string[]) => void;
}

// Local type for the modal, only has the fields we need.
interface SelectableNote {
  id: string;
  title: string | null;
  created_at: string;
}

export function LinkEditorModal({ noteId, onClose, onSave }: LinkEditorModalProps) {
  const [allNotes, setAllNotes] = useState<SelectableNote[]>([]);
  const [initialConnections, setInitialConnections] = useState<string[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch all notes (just id and title) and current connections in parallel
        const allNotesPromise = supabase.from('notes').select('id, title, created_at').neq('id', noteId).order('created_at', { ascending: false });
        const connectionsPromise = supabase.rpc('get_connections_for_note', { target_note_id: noteId });

        const [allNotesRes, connectionsRes] = await Promise.all([allNotesPromise, connectionsPromise]);

        if (allNotesRes.error) throw allNotesRes.error;
        if (connectionsRes.error) throw connectionsRes.error;

        const connectionsData = connectionsRes.data || [];
        const currentConnectionIds: string[] = [];
        for (const item of connectionsData) {
            if (item && typeof item.id === 'string') {
                currentConnectionIds.push(item.id);
            }
        }
        const initialSet = new Set(currentConnectionIds);
        
        setInitialConnections(currentConnectionIds);
        setSelectedLinks(initialSet);
        setAllNotes(allNotesRes.data || []);

      } catch (error: any) {
        toast.error(`데이터 로딩 실패: ${error.message}`);
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [noteId]);

  const handleToggleLink = (targetNoteId: string) => {
    setSelectedLinks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetNoteId)) {
        newSet.delete(targetNoteId);
      } else {
        newSet.add(targetNoteId);
      }
      return newSet;
    });
  };

  const handleConfirmSave = () => {
    const initialSet = new Set(initialConnections);
    const linksToAdd = [...selectedLinks].filter(id => !initialSet.has(id));
    const linksToRemove = [...initialSet].filter(id => !selectedLinks.has(id));
    onSave(linksToAdd, linksToRemove);
    onClose();
  };

  const modalActions = (
    <>
      <button className="btn" onClick={onClose}>취소</button>
      <button className="btn btn-primary" onClick={handleConfirmSave}>저장</button>
    </>
  );

  return (
    <Modal title="노트 연결 관리" onClose={onClose} actions={modalActions}>
      {isLoading ? (
        <p>노트 목록을 불러오는 중...</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <ul>
            {allNotes.map(note => (
              <li key={note.id} className="flex items-center justify-between p-2 hover:bg-slate-700 rounded-md">
                <span className="truncate">{note.title}</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={selectedLinks.has(note.id)}
                  onChange={() => handleToggleLink(note.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}