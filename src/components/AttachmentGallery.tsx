
import { useEffect, useState } from "react";
import { db, Attachment } from "../lib/db";

export function AttachmentGallery({ noteId }: { noteId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const arr = await db.attachments.where("noteId").equals(noteId).toArray();
      if (alive) setItems(arr);
    })();
    return () => { alive = false; };
  }, [noteId]);

  if (items.length === 0) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {items.filter(a => a.blob).map(a => {
        const url = URL.createObjectURL(a.blob!);
        const isImage = a.type.startsWith("image/");
        return (
          <a href={url} target="_blank" rel="noreferrer" key={a.id} className="block">
            {isImage ? (
              <img src={url} alt={a.name} className="rounded-xl w-full h-24 object-cover" />
            ) : (
              <div className="rounded-xl border border-slate-600 p-3 text-xs break-all">{a.name}</div>
            )}
          </a>
        );
      })}
    </div>
  );
}
