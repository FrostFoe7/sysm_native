/**
 * UI and Layout constants
 */

export const HEADER_HEIGHT = 250;

// Tailwind CSS v4.1 standard breakpoints
export const BREAKPOINTS = {
  sm: 640, // 40rem
  md: 768, // 48rem
  lg: 1024, // 64rem
  xl: 1280, // 80rem
  "2xl": 1536, // 96rem
};

export const DESKTOP_BREAKPOINT = BREAKPOINTS.lg;

export const BORDER_RADIUS = 12;
export const GAP = 2;

export const SPRING_CONFIG = { damping: 20, stiffness: 200 };
export const BOUNCY_SPRING_CONFIG = { damping: 6, stiffness: 400, mass: 0.4 };
