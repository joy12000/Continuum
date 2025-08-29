
import React from 'react';
import { ConnectionsPanel } from '../components/ConnectionsPanel';
import { ConnectionsGraph } from '../components/ConnectionsGraph';
import { ConnectionsWeights } from '../components/ConnectionsWeights';
import { useConnections } from '../hooks/useConnections';

const LinksPage = () => {
  const {
    notes,
    weights,
    setWeights,
    selectedNoteId,
    setSelectedNoteId,
    panelNeighbors,
    graphNodes,
    graphLinks,
    loading,
  } = useConnections();

  return (
    <div className="p-4 flex flex-col md:flex-row gap-4 h-full">
      <div className="md:w-1/4 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Select a Note</h1>
        <div className="overflow-y-auto border rounded-lg p-2 h-64 md:h-auto flex-grow">
          {(notes || []).map(note => (
            <div 
              key={note.id} 
              className={`p-2 rounded cursor-pointer ${selectedNoteId === note.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => setSelectedNoteId(note.id)}
            >
              {note.title || 'Untitled Note'}
            </div>
          ))}
        </div>
        <ConnectionsWeights value={weights} onChange={setWeights} />
      </div>

      <div className="md:w-3/4 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading connections...</div>
        ) : !selectedNoteId ? (
          <div className="flex items-center justify-center h-full text-gray-500">Select a note to see its connections.</div>
        ) : (
          <>
            <div className="flex-grow h-96 md:h-auto">
              <ConnectionsGraph nodes={graphNodes} links={graphLinks} onSelect={setSelectedNoteId} />
            </div>
            <ConnectionsPanel neighbors={panelNeighbors} onSelect={setSelectedNoteId} />
          </>
        )}
      </div>
    </div>
  );
};

export default LinksPage;
