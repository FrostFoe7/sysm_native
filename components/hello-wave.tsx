import { Text, Platform } from 'react-native';
import { isWeb } from '@/utils/animatedWebSafe';

// Only import Animated on native
let Animated: any = null;
if (!isWeb) {
  try {
    Animated = require('react-native-reanimated').default;
  } catch (e) {}
}

export function HelloWave() {
  if (isWeb) {
    return (
      <Text
        style={{
          fontSize: 28,
          lineHeight: 32,
          marginTop: -6,
        }}>
        👋
      </Text>
    );
  }

  // Native with Reanimated
  if (!Animated) return <Text style={{ fontSize: 28 }}>👋</Text>;

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
