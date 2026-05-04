'use client';
import React from 'react';
import Moon from './Moon';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const layoutClasses = `relative min-h-screen text-foreground font-sans ${transparent ? '' : ''} ${className || ''}`;
  
  const contentWrapperClasses = fullWidth 
    ? "w-full px-4 py-8 pb-14"
    : "w-full md:max-w-3xl mx-auto px-4 py-8 pb-14";

  return (
    <div className={layoutClasses}>
      {!hideMoon && <Moon onClick={() => router.push('/settings')} />}
      <div className={contentWrapperClasses}>
        {title && (
          <div className="relative text-center mb-6">
            {!hideBackButton &&
              <button 
                onClick={() => router.back()} 
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-surface transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={24} className="text-foreground" />
              </button>
            }
            <h1 className="text-[24px] font-bold text-foreground inline-block tracking-tight">
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
