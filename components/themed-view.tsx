import { SafeView } from '@/utils/animatedWebSafe';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ThemedViewProps } from '@/types/types';

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <SafeView style={[{ backgroundColor }, style]} {...otherProps} />;
}
