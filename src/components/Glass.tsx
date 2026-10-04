import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSettings } from '@/lib/settings';

// Superficie "de cristal": desenfoque real en iOS y translúcida en Android.
// Un borde fino claro arriba simula el canto del cristal; la sombra se tiñe del tema.
export function Glass({ children, style, strong }: { children?: ReactNode; style?: StyleProp<ViewStyle>; strong?: boolean }) {
  const { pal } = useSettings();
  return (
    <View
      style={[
        {
          backgroundColor: strong ? pal.card : pal.glass,
          borderColor: pal.glassBorder,
          borderWidth: StyleSheet.hairlineWidth * 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {Platform.OS === 'ios' && <BlurView intensity={strong ? 40 : 28} tint={pal.blurTint} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}
