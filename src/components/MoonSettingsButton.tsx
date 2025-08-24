import React from 'react';

export default function MoonSettingsButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      aria-label="설정 열기"
      {...props}
      className={"rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300/70 " + (props.className||"")}
      style={{
        ...(props.style||{}),
        background: 'radial-gradient(40% 40% at 35% 35%, rgba(255,255,255,0.95) 0%, rgba(240,246,255,0.85) 40%, rgba(210,225,255,0.75) 65%, rgba(180,200,255,0.60) 85%, rgba(150,175,245,0.35) 100%)',
        boxShadow: '0 0 20px rgba(150,180,255,0.55), 0 0 50px rgba(120,160,255,0.25)',
      }}
    />
  );
}
