import { Text } from 'react-native';
import { isWeb } from '@/utils/animatedWebSafe';

// Only import Animated on native
let Animated: any = null;
if (!isWeb) {
  Animated = require('react-native-reanimated').default;
}

export function HelloWave() {
  if (isWeb) {
    return (
      <Text
        style={{
          fontSize: 28,
          lineHeight: 32,
          marginTop: -6,
          animationName: {
            '50%': { transform: [{ rotate: '25deg' }] },
          },
          animationIterationCount: 4,
          animationDuration: '300ms',
        } as any}>
        👋
      </Text>
    );
  }

  // Native with Reanimated
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
      }}>
      👋
    </Animated.Text>
  );
}
