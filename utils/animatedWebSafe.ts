import { Platform, View as RNView, Pressable as RNPressable, Text as RNText } from 'react-native';

/**
 * Reliable web detection
 */
export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;

// Fallback types and objects for Reanimated
let Animated: any = {
  View: RNView,
  Text: RNText,
  createAnimatedComponent: (c: any) => c,
};
let useAnimatedStyleBase: any = (worklet: any) => worklet();
let useSharedValueBase: any = (val: any) => ({ value: val });
let withTimingBase: any = (val: any) => val;
let withSpringBase: any = (val: any) => val;
let withDelayBase: any = (delay: any, anim: any) => anim;
let withSequenceBase: any = (...anims: any[]) => anims[anims.length - 1];
let EasingBase: any = {
  out: (n: any) => n,
  in: (n: any) => n,
  inOut: (n: any) => n,
  quad: (n: any) => n,
  cubic: (n: any) => n,
  bezier: () => ({}),
};
let FadeInBase: any = null;
let FadeInDownBase: any = null;
let FadeOutBase: any = null;

// Only load Reanimated on native to avoid web-side CSSStyleDeclaration errors
// Reanimated 4/Worklets can be tricky on web with RNW
if (isNative) {
  try {
    const Reanimated = require('react-native-reanimated');
    Animated = Reanimated.default;
    useAnimatedStyleBase = Reanimated.useAnimatedStyle;
    useSharedValueBase = Reanimated.useSharedValue;
    withTimingBase = Reanimated.withTiming;
    withSpringBase = Reanimated.withSpring;
    withDelayBase = Reanimated.withDelay;
    withSequenceBase = Reanimated.withSequence;
    EasingBase = Reanimated.Easing;
    FadeInBase = Reanimated.FadeIn;
    FadeInDownBase = Reanimated.FadeInDown;
    FadeOutBase = Reanimated.FadeOut;
  } catch (e) {
    console.warn('Reanimated failed to load on native:', e);
  }
}

/**
 * Web-safe animated style hook
 */
export function useAnimatedStyle(worklet: () => Record<string, any>) {
  if (isWeb) {
    // Return a plain style object on web to avoid Reanimated proxy issues
    return worklet();
  }
  return useAnimatedStyleBase(worklet);
}

/**
 * Web-safe shared value hook
 */
export function useSharedValue(initialValue: any) {
  if (isWeb) {
    return { value: initialValue };
  }
  return useSharedValueBase(initialValue);
}

/**
 * Web-safe animation functions
 */
export const withTiming = withTimingBase;
export const withSpring = withSpringBase;
export const withDelay = withDelayBase;
export const withSequence = withSequenceBase;
export const Easing = EasingBase;
export const FadeIn = FadeInBase;
export const FadeInDown = FadeInDownBase;
export const FadeOut = FadeOutBase;

/**
 * Web-safe animated components
 */
export const SafeAnimatedView = isWeb ? RNView : Animated.View || RNView;
export const SafeAnimatedPressable = isWeb ? RNPressable : Animated.createAnimatedComponent(RNPressable);
export const SafeAnimatedText = isWeb ? RNText : Animated.Text || Animated.createAnimatedComponent(RNText);

/**
 * Helper to wrap components for animations
 */
export function createAnimatedComponent(component: any) {
  if (isWeb) return component;
  return Animated.createAnimatedComponent(component);
}
