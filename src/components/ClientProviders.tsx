'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SkySettingsProvider } from '@/contexts/SkySettingsContext';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SkySettingsProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1f2937',
                color: '#f3f4f6',
                border: '1px solid #374151',
              },
            }}
          />
        </SkySettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
