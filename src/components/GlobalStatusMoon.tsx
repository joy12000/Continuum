import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type NotificationStatus = 'idle' | 'loading' | 'success' | 'error';

interface GlobalStatusMoonProps {
  status: NotificationStatus;
}

const GlobalStatusMoon: React.FC<GlobalStatusMoonProps> = ({ status }) => {
  const navigate = useNavigate();
  const longPressTimer = useRef<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = () => {
    setIsPressed(true);
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('global-moon:long-press'));
      longPressTimer.current = null; // Prevent click after long press
    }, 520);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      navigate("/settings");
    }
  };

  const getStatusClasses = () => {
    switch (status) {
      case 'loading':
        return 'animate-pulse text-sky-300';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-white';
    }
  };

  return (
    <button
      aria-label="Status and Settings"
      className={`fixed top-2 right-2 z-50 p-2 rounded-full transition-all duration-200 focus:outline-none hover:scale-105 ${isPressed ? 'scale-95' : ''} ${getStatusClasses()}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg width="44" height="44" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="realisticGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          </filter>
          <radialGradient id="moonShading" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="black" stopOpacity="0.3" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="24" fill="currentColor" />
        <circle cx="32" cy="32" r="24" fill="currentColor" opacity="0.5" filter="url(#realisticGlow)" />
        <g opacity="0.2" fill="black">
          <circle cx="25" cy="25" r="8" /><circle cx="42" cy="40" r="5" /><circle cx="45" cy="28" r="3" /><circle cx="22" cy="40" r="2.5" /><circle cx="33" cy="45" r="2" />
        </g>
        <circle cx="32" cy="32" r="24" fill="url(#moonShading)" />
      </svg>
    </button>
  );
};

export default GlobalStatusMoon;