import React from 'react';
import Moon from './Moon';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  transparent?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, transparent, fullWidth, className }) => {
  const navigate = useNavigate();
  const layoutClasses = `relative text-foreground font-sans ${transparent ? '' : 'bg-background'} ${className || ''}`;
  
  const contentWrapperClasses = fullWidth 
    ? "w-full px-4 py-8"
    : "w-full md:max-w-3xl mx-auto px-4 py-8";

  return (
    <div className={layoutClasses}>
      <Moon onClick={() => navigate('/settings')} />
      <div className={contentWrapperClasses}>
        {title && (
          <div className="relative text-center mb-6">
            <button 
              onClick={() => navigate(-1)} 
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={24} className="text-gray-200" />
            </button>
            <h1 className="text-3xl font-bold text-gray-200 text-shadow-glow inline-block">
              {title}
            </h1>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
