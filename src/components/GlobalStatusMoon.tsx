import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type NotificationStatus = 'idle' | 'loading' | 'success' | 'error';

interface GlobalStatusMoonProps {
  status: NotificationStatus;
}

const GlobalStatusMoon: React.FC<GlobalStatusMoonProps> = ({ status }) => {
  const navigate = useNavigate();
  const longPressTimer = useRef<number | null>(null);

  const handlePointerDown = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('global-moon:long-press'));
      longPressTimer.current = null; // Prevent click after long press
    }, 520);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      navigate("/settings");
    }
  };

  const handlePointerLeave = () => {
    // Cancel pending click/long-press if pointer leaves the button area
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getStatusClasses = () => {
    switch (status) {
      case 'loading':
        // A "breathing glow" effect by combining color and a pulsing shadow.
        return 'animate-pulse text-sky-300 shadow-sky-300/50 shadow-[0_0_15px]';
      case 'success':
        // A static glow to indicate success.
        return 'text-green-400 shadow-green-400/50 shadow-[0_0_15px]';
      case 'error':
        // A static glow to indicate an error.
        return 'text-red-500 shadow-red-500/50 shadow-[0_0_15px]';
      default:
        // No glow in idle state.
        return 'text-white shadow-transparent';
    }
  };

  return (
    <button
      aria-label="Status and Settings"
      className={`fixed top-2 right-2 z-50 p-2 rounded-full transition-[color,box-shadow,transform] duration-300 ease-in-out focus:outline-none hover:scale-105 active:scale-95 ${getStatusClasses()}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      <img src="/icons/moon-icon.svg" alt="Status Moon" className="w-22 h-22" />
    </button>
  );
};

export default GlobalStatusMoon;