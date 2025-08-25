
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/calendar', icon: 'calendar', label: 'Calendar' },
  { to: '/search', icon: 'search', label: 'Search' },
  { to: '/recall', icon: 'link', label: 'Links' },
];

export default function NewBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 mx-auto mb-2 flex h-12 w-[min(520px,92%)] items-center justify-around
                 rounded-full border border-white/10 bg-black/40 backdrop-blur"
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.to}
          icon={tab.icon as any}
          label={tab.label}
          active={location.pathname === tab.to}
          onClick={() => navigate(tab.to)}
        />
      ))}
    </nav>
  );
}

function Tab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: 'home' | 'calendar' | 'search' | 'link';
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-full px-3 text-sm transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'
      }`}
    >
      <span className="inline-block">{getIcon(icon)}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function getIcon(name: 'home' | 'calendar' | 'search' | 'link') {
  switch (name) {
    case 'home':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M3 11.5 12 4l9 7.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-8.5Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'calendar':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'search':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"></circle>
          <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.5"></path>
        </svg>
      );
    case 'link':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M10 14l-1.5 1.5a4 4 0 1 1-5.7-5.7L4.5 8" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 10l1.5-1.5a4 4 0 1 1 5.7 5.7L19.5 16" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}
