import React from 'react';
import Moon from './Moon';
import { useNavigate } from 'react-router-dom';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  transparent?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, transparent }) => {
  const navigate = useNavigate();
  const layoutClasses = `relative h-screen overflow-y-auto overflow-x-hidden text-foreground font-sans ${transparent ? '' : 'bg-background'}`;;
  return (
    <div className={layoutClasses}>
      <Moon onClick={() => navigate('/settings')} />
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
