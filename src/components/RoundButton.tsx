import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/lib/settings';
import { Glass } from './Glass';
import { Icon } from './Icon';

export function RoundButton({
  icon,
  label,
  onPress,
  size = 62,
  badge,
}: {
  icon: string;
  label?: string;
  onPress: () => void;
  size?: number;
  badge?: boolean;
}) {
  const { pal } = useSettings();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.wrap}>
      <View>
        <Glass style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
          <Icon d={icon} size={size * 0.42} color={pal.icon} />
        </Glass>
        {badge && <View style={styles.badge} />}
      </View>
      {label ? <Text style={[styles.label, { color: pal.text }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 5 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E0362C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  label: { fontSize: 12, fontWeight: '800' },
});
