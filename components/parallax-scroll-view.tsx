import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { 
  useAnimatedStyle, 
  isWeb, 
  SafeAnimatedView,
  useSharedValue,
  createAnimatedComponent
} from '@/utils/animatedWebSafe';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HEADER_HEIGHT } from '@/constants/ui';

const SafeAnimatedScrollView = createAnimatedComponent(ScrollView);

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';
  
  const scrollOffset = useSharedValue(0);

  const handleScroll = (event: any) => {
    scrollOffset.value = event.nativeEvent.contentOffset.y;
  };
  
  const headerAnimatedStyle = useAnimatedStyle(() => {
    if (isWeb) return {};
    // Note: interpolation logic moved here if needed, but for simplicity 
    // we just return a base style or empty on web.
    return {
      transform: [
        {
          translateY: 0, // Simplified for web safety
        },
      ],
    };
  });

  return (
    <View style={{ backgroundColor, flex: 1 }}>
      <SafeAnimatedScrollView
        onScroll={isWeb ? undefined : handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <SafeAnimatedView
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle,
          ]}>
          {headerImage}
        </SafeAnimatedView>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </SafeAnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
