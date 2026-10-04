import { StyleSheet, Text, View } from 'react-native';
import { haptic } from '@/lib/motion';
import { useSettings } from '@/lib/settings';
import { font } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon } from './Icon';
import { Pressy } from './Pressy';

export function RoundButton({
  icon,
  label,
  showLabel = true,
  onPress,
  size = 62,
  badge,
}: {
  icon: string;
  label: string;
  showLabel?: boolean;
  onPress: () => void;
  size?: number;
  badge?: boolean;
}) {
  const { pal } = useSettings();
  return (
    <Pressy
      onPress={() => {
        haptic.light();
        onPress();
      }}
      hitSlop={size < 48 ? (48 - size) / 2 : 0}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, hay algo nuevo` : label}
      style={styles.wrap}
      scaleTo={0.92}
    >
      <View>
        <Glass style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Icon d={icon} size={size * 0.4} color={pal.icon} />
        </Glass>
        {badge && <View style={[styles.badge, { backgroundColor: pal.accent, borderColor: pal.sky[0] }]} />}
      </View>
      {showLabel ? <Text style={[styles.label, { color: pal.text }]}>{label}</Text> : null}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 1, top: 1, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5 },
  label: { fontSize: 13, fontFamily: font.bold, letterSpacing: 0.1 },
});
