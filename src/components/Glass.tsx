import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSettings } from '@/lib/settings';

// Superficie "de cristal": desenfoque real en iOS y translúcida en Android.
export function Glass({ children, style, strong }: { children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean }) {
  const { pal } = useSettings();
  return (
    <View
      style={[
        {
          backgroundColor: strong ? pal.card : pal.glass,
          borderColor: pal.glassBorder,
          borderWidth: 1.5,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' && <BlurView intensity={30} tint={pal.blurTint} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}
