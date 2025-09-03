import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {title && (
          <h1 
            className="text-3xl font-bold mb-6 text-center text-primary text-shadow-glow"
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
