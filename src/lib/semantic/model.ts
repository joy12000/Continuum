// src/lib/semantic/model.ts
import { embeddingModels } from './models';

const KEY = 'embeddingModel:v1';

export function getActiveModelId(): string {
  const storedId = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  // Ensure the stored ID is one of the available models, otherwise return default
  if (storedId && embeddingModels.some(m => m.id === storedId)) {
    return storedId;
  }
  return embeddingModels.find(m => m.status === 'DOWNLOADED')?.id || 'ko-sroberta'; // Default to the first downloaded model
}

export function setActiveModelId(id: string) {
  try {
    localStorage.setItem(KEY, id);
    // Optionally, dispatch an event to notify other parts of the app
    window.dispatchEvent(new CustomEvent('embedding-model-changed', { detail: { modelId: id } }));
  } catch (e) {
    console.error('Failed to set active model in localStorage', e);
  }
}
