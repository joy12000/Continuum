'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { to: '/', icon: 'home', label: '홈' },
  { to: '/calendar', icon: 'calendar', label: '캘린더' },
  { to: '/search', icon: 'search', label: '검색' },
  { to: '/threads', icon: 'link', label: '인사이트' },
];

export default function NewBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 flex h-[56px] w-full max-w-[480px] mx-auto items-center justify-around
                 border-t border-border bg-white"
    >
      {TABS.map((tab) => (
        <TabLink
          key={tab.to}
          to={tab.to}
          icon={tab.icon as any}
          label={tab.label}
          active={pathname === tab.to}
        />
      ))}
    </nav>
  );
}

function TabLink({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: 'home' | 'calendar' | 'search' | 'link';
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={to}
      className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
        active ? 'text-primary' : 'text-dim-text hover:text-secondary-text'
      }`}
    >
      <span className="inline-block">{getIcon(icon, active)}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

function getIcon(name: 'home' | 'calendar' | 'search' | 'link', active?: boolean) {
  const strokeColor = active ? 'currentColor' : 'currentColor';
  const fill = active ? 'currentColor' : 'none';

  switch (name) {
    case 'home':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill}>
          <path d="M3 11.5 12 4l9 7.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8.5Z" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"} />
        </svg>
      );
    case 'calendar':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill}>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"} />
          <path d="M16 3v4M8 3v4M3 10h18" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"} />
        </svg>
      );
    case 'search':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill}>
          <circle cx="11" cy="11" r="7" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"}></circle>
          <path d="M20 20l-3.2-3.2" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"}></path>
        </svg>
      );
    case 'link':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={fill}>
          <path d="M10 14l-1.5 1.5a4 4 0 1 1-5.7-5.7L4.5 8" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"} />
          <path d="M14 10l1.5-1.5a4 4 0 1 1 5.7 5.7L19.5 16" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"} />
          <path d="M8 12h8" stroke={strokeColor} strokeWidth={active ? "2" : "1.5"} />
        </svg>
      );
  }
}
