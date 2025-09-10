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
  hideMoon?: boolean;
  hideBackButton?: boolean;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, transparent, fullWidth, className, hideMoon, hideBackButton }) => {
  const navigate = useNavigate();
  const layoutClasses = `relative min-h-screen text-foreground font-sans ${transparent ? '' : ''} ${className || ''}`;
  
  const contentWrapperClasses = fullWidth 
    ? "w-full px-4 py-8 pb-14"
    : "w-full md:max-w-3xl mx-auto px-4 py-8 pb-14";

  return (
    <div className={layoutClasses}>
      {!hideMoon && <Moon onClick={() => navigate('/settings')} />}
      <div className={contentWrapperClasses}>
        {title && (
          <div className="relative text-center mb-6">
            {!hideBackButton &&
              <button 
                onClick={() => navigate(-1)} 
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={24} className="text-gray-200" />
              </button>
            }
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
