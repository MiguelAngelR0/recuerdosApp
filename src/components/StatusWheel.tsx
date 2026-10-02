import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/lib/settings';
import type { StatusId } from '@/lib/supabase';
import { statuses } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon, icons } from './Icon';

const DISC = 320;
const ITEM = 78;
const RADIUS = 110;

export function StatusWheel({ visible, current, onPick, onClose }: { visible: boolean; current: StatusId; onPick: (s: StatusId) => void; onClose: () => void }) {
  const { pal } = useSettings();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [visible, spin]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar ruleta" />
        <Text style={styles.title}>¿Qué estás haciendo?</Text>
        <Animated.View
          style={{
            opacity: spin,
            transform: [
              { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-140deg', '0deg'] }) },
              { scale: spin.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          }}
        >
          <Glass style={styles.disc}>
            {statuses.map((s, i) => {
              const a = ((-90 + i * 60) * Math.PI) / 180;
              const on = s.id === current;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => onPick(s.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.item,
                    {
                      left: DISC / 2 + RADIUS * Math.cos(a) - ITEM / 2 - 1.5,
                      top: DISC / 2 + RADIUS * Math.sin(a) - ITEM / 2 - 1.5,
                      backgroundColor: on ? pal.accent : 'rgba(255,255,255,0.78)',
                    },
                  ]}
                >
                  <Icon d={s.icon} size={24} color={on ? '#FFFFFF' : '#2E1A28'} />
                  <Text style={[styles.itemLabel, { color: on ? '#FFFFFF' : '#2E1A28' }]}>{s.label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={onClose} accessibilityLabel="Cerrar" style={[styles.center, { backgroundColor: pal.accent }]}>
              <Icon d={icons.close} size={26} color="#FFFFFF" strokeWidth={2.6} />
            </Pressable>
          </Glass>
        </Animated.View>
        <Text style={styles.note}>Tu pareja verá tu estado al momento</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(40,20,45,0.45)', alignItems: 'center', justifyContent: 'center', gap: 24 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  note: { color: '#FFFFFF', fontSize: 14 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2 },
  item: {
    position: 'absolute',
    width: ITEM,
    height: ITEM,
    borderRadius: ITEM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  itemLabel: { fontSize: 11, fontWeight: '800' },
  center: {
    position: 'absolute',
    left: DISC / 2 - 36 - 1.5,
    top: DISC / 2 - 36 - 1.5,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
