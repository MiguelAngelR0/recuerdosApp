import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { formatMemoryDate, MemoryItem } from '@/lib/memories';
import { EASE_OUT, haptic } from '@/lib/motion';
import { useSettings } from '@/lib/settings';
import { font } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon, icons } from './Icon';
import { Pressy } from './Pressy';

const ROW = 76; // alto de fila (64) + hueco (12)
const settle = { duration: 220, easing: EASE_OUT };

type Slots = Record<string, number>;

function slotsOf(items: MemoryItem[]): Slots {
  return Object.fromEntries(items.map((m, i) => [m.id, i]));
}

function idsBySlot(slots: Slots) {
  'worklet';
  return Object.keys(slots).sort((a, b) => slots[a] - slots[b]);
}

function Row({
  item,
  slot,
  slots,
  active,
  dragY,
  count,
  onMove,
  onDrop,
  onDragStart,
}: {
  item: MemoryItem;
  slot: number;
  slots: SharedValue<Slots>;
  active: SharedValue<string | null>;
  dragY: SharedValue<number>;
  count: number;
  onMove: (id: string, dir: -1 | 1) => void;
  onDrop: (ids: string[]) => void;
  onDragStart: () => void;
}) {
  const { pal } = useSettings();
  const startY = useSharedValue(0);

  // Arrastrar desde el asa: la fila sigue al dedo y las demás se apartan.
  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      active.set(item.id);
      startY.set(slots.get()[item.id] * ROW);
      dragY.set(startY.get());
      scheduleOnRN(onDragStart);
    })
    .onUpdate((e) => {
      const start = slots.get()[item.id];
      const y = Math.min(Math.max(startY.get() + e.translationY, -ROW / 2), (count - 1) * ROW + ROW / 2);
      dragY.set(y);
      const target = Math.min(Math.max(Math.round(y / ROW), 0), count - 1);
      if (target !== start) {
        const next = { ...slots.get() };
        const other = Object.keys(next).find((k) => next[k] === target);
        if (other) next[other] = start;
        next[item.id] = target;
        slots.set(next);
        scheduleOnRN(haptic.select);
      }
    })
    .onFinalize(() => {
      if (active.get() !== item.id) return;
      active.set(null);
      scheduleOnRN(onDrop, idsBySlot(slots.get()));
    });

  const style = useAnimatedStyle(() => {
    const dragging = active.get() === item.id;
    return {
      zIndex: dragging ? 10 : 0,
      transform: [
        { translateY: dragging ? dragY.get() : withTiming(slots.get()[item.id] * ROW, settle) },
        { scale: withSpring(dragging ? 1.03 : 1, { duration: 300, dampingRatio: 0.8 }) },
      ],
      shadowOpacity: withTiming(dragging ? 0.18 : 0, settle),
    };
  });

  return (
    <Animated.View style={[styles.rowWrap, { shadowColor: pal.text }, style]}>
      <Glass strong style={styles.row}>
        {item.url ? <Image source={{ uri: item.url }} style={styles.thumb} /> : <View style={[styles.thumb, { backgroundColor: pal.glass }]} />}
        <View style={{ flex: 1 }}>
          <Text style={[styles.text, { color: pal.text }]} numberOfLines={1}>
            {item.text || 'Sin texto'}
          </Text>
          <Text style={[styles.date, { color: pal.muted }]}>{formatMemoryDate(item)}</Text>
        </View>
        <Pressy onPress={() => onMove(item.id, -1)} disabled={slot === 0} scaleTo={0.88} hitSlop={4} accessibilityRole="button" accessibilityLabel="Subir" style={[styles.arrow, { opacity: slot === 0 ? 0.3 : 1 }]}>
          <Icon d={icons.up} size={22} color={pal.icon} strokeWidth={2.4} />
        </Pressy>
        <Pressy onPress={() => onMove(item.id, 1)} disabled={slot === count - 1} scaleTo={0.88} hitSlop={4} accessibilityRole="button" accessibilityLabel="Bajar" style={[styles.arrow, { opacity: slot === count - 1 ? 0.3 : 1 }]}>
          <Icon d={icons.down} size={22} color={pal.icon} strokeWidth={2.4} />
        </Pressy>
        <GestureDetector gesture={pan}>
          <View style={styles.grip} accessibilityLabel="Arrastrar para ordenar">
            <Icon d={icons.grip} size={22} color={pal.muted} strokeWidth={3.2} />
          </View>
        </GestureDetector>
      </Glass>
    </Animated.View>
  );
}

// Lista para ordenar la enredadera: de arriba (lo más alto de la planta) abajo.
export function SortableMemories({ items, onReorder, onDragChange }: { items: MemoryItem[]; onReorder: (ids: string[]) => void; onDragChange: (dragging: boolean) => void }) {
  const [order, setOrder] = useState(() => items.map((m) => m.id));
  const slots = useSharedValue<Slots>(slotsOf(items));
  const active = useSharedValue<string | null>(null);
  const dragY = useSharedValue(0);

  useEffect(() => {
    setOrder(items.map((m) => m.id));
    slots.set(slotsOf(items));
  }, [items, slots]);

  const move = (id: string, dir: -1 | 1) => {
    const ids = [...order];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    haptic.select();
    slots.set(Object.fromEntries(ids.map((k, n) => [k, n])));
    setOrder(ids);
    onReorder(ids);
  };

  const drop = (ids: string[]) => {
    onDragChange(false);
    setOrder(ids);
    if (ids.join() !== order.join()) onReorder(ids);
  };

  return (
    <View style={{ height: items.length * ROW }}>
      {items.map((m) => (
        <Row key={m.id} item={m} slot={order.indexOf(m.id)} slots={slots} active={active} dragY={dragY} count={items.length} onMove={move} onDrop={drop} onDragStart={() => onDragChange(true)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: { position: 'absolute', left: 0, right: 0, top: 0, height: ROW - 12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingLeft: 8, paddingRight: 4 },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  text: { fontSize: 16, fontFamily: font.bold },
  date: { fontSize: 13, fontFamily: font.body },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  grip: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
});
