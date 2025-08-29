alter table public.notes add column if not exists tags text[];
alter table public.notes add column if not exists citations jsonb;
create index if not exists idx_notes_tags_gin on public.notes using gin (tags);
create index if not exists idx_notes_citations_out on public.notes using gin ((citations -> 'out'));
