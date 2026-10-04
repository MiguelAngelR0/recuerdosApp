import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { EASE_OUT, haptic } from '@/lib/motion';
import { useSettings } from '@/lib/settings';
import type { StatusId } from '@/lib/supabase';
import { font, statuses } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon, icons } from './Icon';
import { Pressy } from './Pressy';

const DISC = 320;
const ITEM = 80;
const RADIUS = 110;

export function StatusWheel({ visible, current, onPick, onClose }: { visible: boolean; current: StatusId; onPick: (s: StatusId) => void; onClose: () => void }) {
  const { pal } = useSettings();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    t.set(0);
    t.set(withTiming(1, { duration: 280, easing: EASE_OUT }));
  }, [visible, t]);

  // La ruleta gira un poco al abrirse: lo justo para que se lea como ruleta, sin rebote.
  const discStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 0.6, 1], [0, 1, 1]),
    transform: reduced ? [] : [{ rotate: `${interpolate(t.get(), [0, 1], [-28, 0])}deg` }, { scale: interpolate(t.get(), [0, 1], [0.94, 1]) }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar ruleta" />
        <Text style={styles.title}>¿Qué estás haciendo?</Text>
        <Animated.View style={discStyle}>
          <Glass style={styles.disc}>
            {statuses.map((s, i) => {
              const a = ((-90 + i * 60) * Math.PI) / 180;
              const on = s.id === current;
              return (
                <Pressy
                  key={s.id}
                  onPress={() => {
                    haptic.select();
                    onPick(s.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                  accessibilityState={{ selected: on }}
                  scaleTo={0.9}
                  style={[
                    styles.item,
                    {
                      left: DISC / 2 + RADIUS * Math.cos(a) - ITEM / 2 - 1,
                      top: DISC / 2 + RADIUS * Math.sin(a) - ITEM / 2 - 1,
                      backgroundColor: on ? pal.accent : pal.sheet,
                      borderColor: on ? pal.accent : pal.line,
                    },
                  ]}
                >
                  <Icon d={s.icon} size={24} color={on ? '#FFFFFF' : pal.icon} />
                  <Text style={[styles.itemLabel, { color: on ? '#FFFFFF' : pal.sheetText }]} numberOfLines={1} adjustsFontSizeToFit>
                    {s.label}
                  </Text>
                </Pressy>
              );
            })}
            <Pressy onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" scaleTo={0.9} style={[styles.center, { backgroundColor: pal.sheet, borderColor: pal.line }]}>
              <Icon d={icons.close} size={24} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
          </Glass>
        </Animated.View>
        <Text style={styles.note}>Tu pareja lo verá al momento</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(30,14,34,0.55)', alignItems: 'center', justifyContent: 'center', gap: 28 },
  title: { color: '#FFFFFF', fontSize: 26, fontFamily: font.display, letterSpacing: -0.3 },
  note: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontFamily: font.body },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2 },
  item: {
    position: 'absolute',
    width: ITEM,
    height: ITEM,
    borderRadius: ITEM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  itemLabel: { fontSize: 11, fontFamily: font.heavy },
  center: {
    position: 'absolute',
    left: DISC / 2 - 30 - 1,
    top: DISC / 2 - 30 - 1,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
