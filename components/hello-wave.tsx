import { Text } from 'react-native';
import { isWeb, SafeAnimatedText } from '@/utils/animatedWebSafe';

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

  // Native with Reanimated fallback
  return (
    <SafeAnimatedText
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
      }}>
      👋
    </SafeAnimatedText>
  );
}
