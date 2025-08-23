import React from 'react';

export function ModelStatus({ status }: { status: string }) {
  return <span className="text-xs text-slate-400">{status}</span>;
}
