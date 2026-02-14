import { type ViewProps } from 'react-native';
import { SafeView } from '@/utils/animatedWebSafe';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <SafeView style={[{ backgroundColor }, style]} {...otherProps} />;
}
