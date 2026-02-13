// components/ScreenLayout.tsx

import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Box } from '@/components/ui/box';

const DESKTOP_BREAKPOINT = 1024;

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
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const maxWidth = isDesktop ? 'max-w-[720px]' : 'max-w-[680px]';

  return (
    <SafeAreaView
      edges={edges}
      className="flex-1 bg-[#101010]"
    >
      <Box
        className={`flex-1 w-full ${
          Platform.OS === 'web' ? `${maxWidth} self-center` : ''
        } ${noPadding ? '' : ''}`}
      >
        {children}
      </Box>
    </SafeAreaView>
  );
}
