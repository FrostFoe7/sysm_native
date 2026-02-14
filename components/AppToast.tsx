// components/AppToast.tsx

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useAnimatedStyle, isWeb } from '@/utils/animatedWebSafe';
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

// Only import Reanimated on native
let useSharedValue: any = null;
let withTiming: any = null;
let withDelay: any = null;
let withSequence: any = null;
let Easing: any = null;
let runOnJS: any = null;
let Animated: any = null;

if (!isWeb) {
  useSharedValue = require('react-native-reanimated').useSharedValue;
  withTiming = require('react-native-reanimated').withTiming;
  withDelay = require('react-native-reanimated').withDelay;
  withSequence = require('react-native-reanimated').withSequence;
  Easing = require('react-native-reanimated').Easing;
  runOnJS = require('react-native-reanimated').runOnJS;
  Animated = require('react-native-reanimated').default;
}

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
  const [opacityWeb, setOpacityWeb] = useState(1);
  const [translateWeb, setTranslateWeb] = useState(0);
  
  const opacity = !isWeb ? useSharedValue(1) : { value: 1 };
  const translateY = !isWeb ? useSharedValue(0) : { value: 0 };

  React.useEffect(() => {
    if (!isWeb) {
      opacity.value = 0;
      translateY.value = 20;
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    }

    const hideTimeout = setTimeout(() => {
      if (!isWeb) {
        opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
        translateY.value = withTiming(20, { duration: 200, easing: Easing.in(Easing.cubic) });
      } else {
        setOpacityWeb(0);
      }
      setTimeout(() => onDone(item.id), 220);
    }, 2200);

    return () => clearTimeout(hideTimeout);
  }, [item.id, onDone, opacity, translateY, isWeb]);

  const animStyle = !isWeb ? {
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  } : {
    opacity: opacityWeb,
    transform: [{ translateY: translateWeb }],
    transition: 'opacity 200ms ease-in-out, transform 200ms ease-in-out',
  };

  const Icon = item.icon || Check;

  const baseStyle = {
    position: 'absolute' as const,
    bottom: isWeb ? 80 : 100,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 9999,
    pointerEvents: 'none' as const,
  };

  return !isWeb ? (
    <Animated.View style={[baseStyle, animStyle]}>
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
  ) : (
    <View style={[baseStyle, animStyle] as any}>
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
    </View>
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
