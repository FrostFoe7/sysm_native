// components/ScreenLayout.tsx

import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Box } from '@/components/ui/box';

interface ScreenLayoutProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  noPadding?: boolean;
}

export function ScreenLayout({
  children,
  edges = ['top'],
  noPadding = false,
}: ScreenLayoutProps) {
  return (
    <SafeAreaView
      edges={edges}
      className="flex-1 bg-[#101010]"
    >
      <Box
        className={`flex-1 w-full ${
          Platform.OS === 'web'
            ? 'max-w-[680px] self-center'
            : ''
        } ${noPadding ? '' : ''}`}
      >
        {children}
      </Box>
    </SafeAreaView>
  );
}
