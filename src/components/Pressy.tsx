import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { press, release } from '@/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number };

// Botón que se hunde al tocarlo (respuesta en el press-in, acción en el press-out).
export function Pressy({ style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      pressRetentionOffset={16}
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, release));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
