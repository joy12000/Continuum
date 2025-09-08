import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  transparent?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, transparent }) => {
  const layoutClasses = `min-h-screen text-foreground font-sans ${transparent ? '' : 'bg-background'}`;
  return (
    <div className={layoutClasses}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {title && (
          <h1 
            className="text-3xl font-bold mb-6 text-center text-gray-200 text-shadow-glow"
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
