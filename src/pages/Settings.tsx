import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-hot-toast';
import { ArrowLeftOnRectangleIcon, CodeBracketIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import PageLayout from '../components/PageLayout';
import { SettingsCard } from '../components/SettingsCard';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteAllNotes = async () => {
    if (confirmText !== "delete all my notes") {
      toast.error('Please type the confirmation phrase exactly as shown.');
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_all_my_notes');
      if (error) throw error;
      toast.success('All notes have been deleted.');
      setShowDeleteConfirm(false);
      setConfirmText("");
      navigate('/');
    } catch (error: any) {
      toast.error(`Failed to delete notes: ${error.message}`);
    }
  };

  return (
    <PageLayout title="Settings">
      <div className="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto">
        
        <SettingsCard title="Developer">
          <button onClick={() => navigate('/developer')} className="w-full flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
            <span>Developer Page</span>
            <CodeBracketIcon className="w-6 h-6" />
          </button>
        </SettingsCard>

        <SettingsCard title="Account">
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
            <span>Logout</span>
            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
          </button>
        </SettingsCard>

        <SettingsCard title="Danger Zone" titleClassName="text-destructive">
          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-8 h-8 text-destructive mr-4 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-destructive-foreground">Delete All Notes</h2>
                <p className="text-sm text-destructive/80 mt-1 mb-4">
                  This action is irreversible. Please proceed with caution.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="w-full flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground font-bold py-2 px-4 rounded-lg transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
              <span>Delete All My Notes...</span>
            </button>
          </div>
        </SettingsCard>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Are you sure you want to delete all notes?"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAllNotes}
        >
          <p className="text-sm text-muted-foreground mb-4">
            This action cannot be undone and will permanently delete all your notes and associated data. To proceed, please type "<strong className='text-destructive'>delete all my notes</strong>" below.
          </p>
          <input 
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-2 bg-background border border-border rounded-md focus:ring-destructive focus:border-destructive transition-colors"
            placeholder='delete all my notes'
          />
        </ConfirmModal>
      )}
    </PageLayout>
  );
};

export default Settings;
