import { Platform, View as RNView } from 'react-native';

/**
 * Reliable web detection
 * Platform.OS may not always be 'web' on Vite/web builds
 * Fallback to checking if we're NOT on iOS/Android
 */
const isWebPlatform =
  Platform.OS === 'web' ||
  (Platform.OS !== 'ios' && Platform.OS !== 'android' && Platform.OS !== 'macos' && Platform.OS !== 'windows');

// Only import Reanimated on native
let Animated: any = null;
let useAnimatedStyleBase: any = null;

if (!isWebPlatform) {
  Animated = require('react-native-reanimated').default;
  useAnimatedStyleBase = require('react-native-reanimated').useAnimatedStyle;
}

/**
 * Web-safe animated style hook
 * - On native: uses Reanimated's useAnimatedStyle for 60fps performance
 * - On web: returns plain style object to avoid CSSStyleDeclaration errors
 */
export function useAnimatedStyle(
  worklet: () => Record<string, any>,
): Record<string, any> {
  if (isWebPlatform) {
    // On web, just evaluate the worklet once and return the result
    return worklet();
  }
  // On native, use Reanimated's hook
  return useAnimatedStyleBase?.(worklet) || {};
}

/**
 * Web-safe animated view component
 * - On native: uses Reanimated.View for animations
 * - On web: uses plain React Native View (no animations)
 */
export const SafeAnimatedView = isWebPlatform ? RNView : Animated?.View || RNView;

/**
 * Helper to check if running on web
 */
export const isWeb = isWebPlatform;

/**
 * Helper to check if running on native (iOS/Android)
 */
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
