import React from "react";

export function ConnectionsBadge({ count, onClick }: { count: number; onClick?: () => void }) {
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs hover:bg-neutral-50"
      aria-label={`연결 ${count}개 보기`}
    >
      <span>↔</span>
      <span>연결 {count}</span>
    </button>
  );
}
