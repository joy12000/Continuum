import React from 'react';
import { ConnectionsPanel } from '../components/ConnectionsPanel';
import { ConnectionsGraph } from '../components/ConnectionsGraph';
import { ConnectionsWeights } from '../components/ConnectionsWeights';
import { useConnections } from '../hooks/useConnections';
import PageLayout from '../components/PageLayout';

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
    <PageLayout title="Connections">
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
        <div className="md:w-1/4 flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-sky-300">Select a Note</h2>
          <div className="overflow-y-auto bg-black/20 border border-white/10 rounded-lg p-2 flex-grow">
            {(notes || []).map(note => (
              <div 
                key={note.id} 
                className={`p-3 rounded-md cursor-pointer transition-colors ${selectedNoteId === note.id ? 'bg-sky-800/70 text-white' : 'hover:bg-white/5'}`}
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
            <div className="flex items-center justify-center h-full text-gray-400">Loading connections...</div>
          ) : !selectedNoteId ? (
            <div className="flex items-center justify-center h-full text-gray-400">Select a note to see its connections.</div>
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
    </PageLayout>
  );
};

export default LinksPage;