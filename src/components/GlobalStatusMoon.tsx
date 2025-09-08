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
      <svg width="88" height="88" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* A more subtle, wider glow */}
          <filter id="realisticGlow" x="-75%" y="-75%" width="250%" height="250%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
          </filter>
          {/* A base texture using turbulence to create a more realistic surface */}
          <filter id="moonTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="10" stitchTiles="stitch" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" result="bumpy"/>
            <feSpecularLighting in="bumpy" surfaceScale="2" specularConstant="1" specularExponent="20" lighting-color="#dddddd" result="specular">
              <fePointLight x="10" y="10" z="40" />
            </feSpecularLighting>
            <feComposite in="specular" in2="SourceGraphic" operator="in" result="lit"/>
            <feBlend in="SourceGraphic" in2="lit" mode="screen"/>
          </filter>
          {/* A gradient for overall shading (light source from top-left) */}
          <radialGradient id="moonShading" cx="25%" cy="25%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="black" stopOpacity="0.25" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="24" fill="currentColor" opacity="0.5" filter="url(#realisticGlow)" />
        <g>
          <circle cx="32" cy="32" r="24" fill="currentColor" />
          <circle cx="32" cy="32" r="24" fill="currentColor" filter="url(#moonTexture)" opacity="0.5" />
          <circle cx="32" cy="32" r="24" fill="url(#moonShading)" />
        </g>
      </svg>
    </button>
  );
};

export default GlobalStatusMoon;