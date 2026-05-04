import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Momentum',
  description: 'Unlock Potential with AI',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/AI_192icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import ClientProviders from '@/components/ClientProviders';
import GlobalLayoutWrapper from '@/components/GlobalLayoutWrapper';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body>
        <ClientProviders>
          <div id="root-layout-wrapper" className="flex flex-col h-screen bg-background text-foreground">
            <GlobalLayoutWrapper>
              {children}
            </GlobalLayoutWrapper>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
