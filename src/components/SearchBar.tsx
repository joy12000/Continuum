
export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="input"
      placeholder="검색 (-제외, date>=YYYY-MM-DD)"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}
