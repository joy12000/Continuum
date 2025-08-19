
export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="input"
      placeholder="검색 (키워드 + 시맨틱, RRF 융합)"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}
