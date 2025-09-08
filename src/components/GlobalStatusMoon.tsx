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
        <defs><radialGradient id="moonGlowNew" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="currentColor" stopOpacity="0.6" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></radialGradient><mask id="crescentMaskNew"><rect width="100%" height="100%" fill="white" /><circle cx="42" cy="26" r="22" fill="black" /></mask></defs>
        <circle cx="32" cy="32" r="28" fill="url(#moonGlowNew)" />
        <circle cx="32" cy="32" r="24" fill="currentColor" mask="url(#crescentMaskNew)" />
      </svg>
    </button>
  );
};

export default GlobalStatusMoon;