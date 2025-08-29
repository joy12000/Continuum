import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071739] to-[#0a2c50] text-gray-200 font-sans">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {title && (
          <h1 
            className="text-3xl font-bold mb-6 text-center"
            style={{
              color: 'rgba(235,243,255,0.92)',
              textShadow: '0 0 0.4rem rgba(180,210,255,0.65), 0 0 1.2rem rgba(140,190,255,0.35)',
            }}
          >
            {title}
          </h1>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
