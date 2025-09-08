
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/calendar', icon: 'calendar', label: 'Calendar' },
  { to: '/search', icon: 'search', label: 'Search' },
  { to: '/threads', icon: 'link', label: 'Threads' },
];

export default function NewBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 mx-auto mb-4 flex h-16 w-[min(520px,92%)] items-center justify-around
                 rounded-2xl border border-white/10 bg-card/80 backdrop-blur-lg shadow-lg"
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
      className={`relative flex flex-col items-center justify-center w-full h-full text-sm transition-colors group ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      <div className={`absolute top-0 h-1 w-8 rounded-b-full ${active ? 'bg-primary' : ''}`}></div>
      <span className="inline-block w-7 h-7">{getIcon(icon, active)}</span>
      <span className="text-xs sm:inline">{label}</span>
      <span className="absolute bottom-full mb-2 hidden group-hover:block bg-card text-primary-foreground text-xs rounded py-1 px-2">
        {label}
      </span>
    </button>
  );
}

function getIcon(name: 'home' | 'calendar' | 'search' | 'link', active?: boolean) {
  const props = { width: 24, height: 24, strokeWidth: active ? 2 : 1.5 };
  switch (name) {
    case 'home':
      return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'link':
      return (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.72" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.72" />
        </svg>
      );
  }
}
