// components/ScreenLayout.tsx

import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Box } from '@/components/ui/box';

interface ScreenLayoutProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenLayout({
  children,
  edges = ['top'],
}: ScreenLayoutProps) {
  return (
    <SafeAreaView
      edges={edges}
      className="flex-1 bg-brand-dark"
    >
      <Box
        className={`w-full flex-1 overflow-hidden ${
          Platform.OS === 'web' 
            ? 'max-w-screen-md self-center lg:max-w-none lg:self-auto' 
            : ''
        }`}
      >
        {children}
      </Box>
    </SafeAreaView>
  );
}
