// components/AppToast.tsx

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import {
  Check,
  Link2,
  Trash2,
  EyeOff,
  VolumeX,
  Volume2,
  Bookmark,
  Flag,
  AlertCircle,
  Repeat2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

interface ToastItem {
  id: number;
  message: string;
  icon?: LucideIcon;
  iconColor?: string;
}

interface ToastContextType {
  showToast: (message: string, icon?: LucideIcon, iconColor?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useAppToast() {
  return useContext(ToastContext);
}

const TOAST_ICONS = {
  copied: Link2,
  deleted: Trash2,
  hidden: EyeOff,
  muted: VolumeX,
  unmuted: Volume2,
  saved: Bookmark,
  reported: Flag,
  reposted: Repeat2,
  success: Check,
  error: AlertCircle,
} as const;

export { TOAST_ICONS };

function ToastView({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });

    const hideTimeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      translateY.value = withTiming(20, { duration: 200, easing: Easing.in(Easing.cubic) });
      setTimeout(() => onDone(item.id), 220);
    }, 2200);

    return () => clearTimeout(hideTimeout);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const Icon = item.icon || Check;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: Platform.OS === 'web' ? 80 : 100,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
        },
        animStyle,
      ]}
    >
      <HStack
        className="bg-[#2a2a2a] rounded-full px-5 py-3 items-center shadow-lg"
        space="sm"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Icon size={16} color={item.iconColor || '#f3f5f7'} strokeWidth={2} />
        <Text className="text-[#f3f5f7] text-[14px] font-medium">{item.message}</Text>
      </HStack>
    </Animated.View>
  );
}

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, icon?: LucideIcon, iconColor?: string) => {
    counterRef.current += 1;
    const id = counterRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, icon, iconColor }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((t) => (
        <ToastView key={t.id} item={t} onDone={removeToast} />
      ))}
    </ToastContext.Provider>
  );
}
