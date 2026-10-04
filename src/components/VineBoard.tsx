import { useEffect } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { formatMemoryDate, MemoryItem } from '@/lib/memories';
import { EASE_OUT, haptic } from '@/lib/motion';
import { useSettings } from '@/lib/settings';
import { font } from '@/lib/theme';
import { Glass } from './Glass';

export const STEP = 190;
const CARD = 160;
const settle = { duration: 260, easing: EASE_OUT };

// slot 0 = abajo, junto a la maceta; el más alto es el de arriba.
type Slots = Record<string, number>;

function topOf(slot: number, count: number) {
  'worklet';
  return (count - 1 - slot) * STEP + 10;
}

function leftOf(slot: number, width: number) {
  'worklet';
  return slot % 2 === 0 ? 16 : width - 16 - CARD;
}

// ids de arriba abajo, el orden en que se guarda.
function topToBottom(slots: Slots) {
  'worklet';
  return Object.keys(slots).sort((a, b) => slots[b] - slots[a]);
}

function slotsOf(items: MemoryItem[]): Slots {
  return Object.fromEntries(items.map((m, i) => [m.id, items.length - 1 - i]));
}

function Vine({ count, color, leaf, pot }: { count: number; color: string; leaf: string; pot: string }) {
  const h = Math.max(count, 1) * STEP + 120;
  let d = `M195 ${h - 60}`;
  for (let y = h - 60, i = 0; y > 20; y -= STEP / 2, i++) {
    const x = i % 2 === 0 ? 120 : 270;
    d += ` Q ${x} ${y - STEP / 4} 195 ${y - STEP / 2}`;
  }
  return (
    <Svg width="100%" height={h} viewBox={`0 0 390 ${h}`} style={StyleSheet.absoluteFill}>
      <Path d={d} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      {Array.from({ length: count * 2 }).map((_, i) => (
        <Ellipse key={i} cx={i % 2 ? 228 : 162} cy={h - 100 - i * (STEP / 2)} rx={16} ry={8} fill={leaf} transform={`rotate(${i % 2 ? 25 : -25} ${i % 2 ? 228 : 162} ${h - 100 - i * (STEP / 2)})`} />
      ))}
      <Path d={`M150 ${h - 46} h90 l-8 34 h-74 z`} fill={pot} />
    </Svg>
  );
}

function Card({
  item,
  index,
  count,
  width,
  slots,
  active,
  drag,
  highlight,
  authorName,
  onOpen,
  onLiveOrder,
  onDrop,
  onDragStart,
}: {
  item: MemoryItem;
  index: number;
  count: number;
  width: number;
  slots: SharedValue<Slots>;
  active: SharedValue<string | null>;
  drag: SharedValue<{ x: number; y: number }>;
  highlight: boolean;
  authorName: string;
  onOpen: (m: MemoryItem) => void;
  onLiveOrder: (ids: string[]) => void;
  onDrop: (ids: string[]) => void;
  onDragStart: () => void;
}) {
  const { pal } = useSettings();
  const pressed = useSharedValue(0);
  const origin = useSharedValue({ x: 0, y: 0 });

  // Tocar abre el recuerdo; mantener pulsado y arrastrar lo cambia de sitio en la planta.
  const tap = Gesture.Tap()
    .maxDuration(350)
    .onBegin(() => pressed.set(withTiming(1, { duration: 110 })))
    .onFinalize(() => pressed.set(withTiming(0, { duration: 180 })))
    .onEnd((_e, ok) => {
      if (ok) scheduleOnRN(onOpen, item);
    });

  const pan = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart(() => {
      const slot = slots.get()[item.id];
      origin.set({ x: leftOf(slot, width), y: topOf(slot, count) });
      drag.set(origin.get());
      active.set(item.id);
      scheduleOnRN(haptic.medium);
      scheduleOnRN(onDragStart);
    })
    .onUpdate((e) => {
      const y = Math.min(Math.max(origin.get().y + e.translationY, -40), (count - 1) * STEP + 50);
      drag.set({ x: origin.get().x + e.translationX, y });
      const current = slots.get()[item.id];
      const target = Math.min(Math.max(Math.round(count - 1 - (y - 10) / STEP), 0), count - 1);
      if (target !== current) {
        const next = { ...slots.get() };
        const other = Object.keys(next).find((k) => next[k] === target);
        if (other) next[other] = current;
        next[item.id] = target;
        slots.set(next);
        scheduleOnRN(haptic.select);
        scheduleOnRN(onLiveOrder, topToBottom(next));
      }
    })
    .onFinalize(() => {
      if (active.get() !== item.id) return;
      active.set(null);
      scheduleOnRN(onDrop, topToBottom(slots.get()));
    });

  const style = useAnimatedStyle(() => {
    const dragging = active.get() === item.id;
    const slot = slots.get()[item.id] ?? 0;
    return {
      zIndex: dragging ? 20 : 1,
      shadowOpacity: withTiming(dragging ? 0.22 : 0, settle),
      transform: [
        { translateX: dragging ? drag.get().x : withTiming(leftOf(slot, width), settle) },
        { translateY: dragging ? drag.get().y : withTiming(topOf(slot, count), settle) },
        { scale: withSpring(dragging ? 1.05 : 1 - pressed.get() * 0.03, { duration: 300, dampingRatio: 0.8 }) },
        { rotate: withSpring(dragging ? '-2deg' : '0deg', { duration: 300, dampingRatio: 0.8 }) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, { shadowColor: pal.text }, style]}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <Animated.View entering={FadeInDown.duration(320).easing(EASE_OUT).delay(Math.min(index, 6) * 50)}>
          <View accessible accessibilityRole="button" accessibilityLabel={`${item.text || 'Recuerdo'}, ${formatMemoryDate(item)}. Toca para editar, mantén pulsado para moverlo`}>
            <Glass strong style={[styles.inner, highlight && { borderColor: pal.accent, borderWidth: 2 }]}>
              {item.url ? <Image source={{ uri: item.url }} style={styles.photo} /> : null}
              {item.text ? (
                <Text style={[styles.text, { color: pal.text }]} numberOfLines={4}>
                  {item.text}
                </Text>
              ) : null}
              <Text style={[styles.meta, { color: pal.muted }]}>
                {formatMemoryDate(item)} · {authorName}
              </Text>
            </Glass>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// La enredadera con sus tarjetas: se ordenan arrastrándolas directamente.
export function VineBoard({
  items,
  authorName,
  onOpen,
  onLiveOrder,
  onReorder,
  onDragChange,
}: {
  items: MemoryItem[]; // de arriba abajo
  authorName: (id: string) => string;
  onOpen: (m: MemoryItem) => void;
  onLiveOrder: (ids: string[]) => void;
  onReorder: (ids: string[]) => void;
  onDragChange: (dragging: boolean) => void;
}) {
  const { pal } = useSettings();
  const { width } = useWindowDimensions();
  const slots = useSharedValue<Slots>(slotsOf(items));
  const active = useSharedValue<string | null>(null);
  const drag = useSharedValue({ x: 0, y: 0 });
  const count = items.length;

  // Cuando cambia el orden desde fuera (tu pareja ordenando), las tarjetas se deslizan a su sitio.
  useEffect(() => {
    if (active.get()) return;
    slots.set(slotsOf(items));
  }, [items, slots, active]);

  const before = items.map((m) => m.id).join();

  return (
    <View style={{ height: Math.max(count, 1) * STEP + 120 }}>
      <Vine count={count} color={pal.vine} leaf={pal.leaf} pot={pal.pot} />
      {items.map((m, i) => (
        <Card
          key={m.id}
          item={m}
          index={i}
          count={count}
          width={width}
          slots={slots}
          active={active}
          drag={drag}
          highlight={i === 0}
          authorName={authorName(m.author_id)}
          onOpen={onOpen}
          onLiveOrder={onLiveOrder}
          onDragStart={() => onDragChange(true)}
          onDrop={(ids) => {
            onDragChange(false);
            if (ids.join() !== before) onReorder(ids);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: 0, top: 0, width: CARD, shadowOffset: { width: 0, height: 12 }, shadowRadius: 20 },
  inner: { borderRadius: 16, padding: 8, gap: 6 },
  photo: { height: 104, borderRadius: 10 },
  text: { fontSize: 15, lineHeight: 20, fontFamily: font.bold, paddingHorizontal: 4 },
  meta: { fontSize: 12, fontFamily: font.body, paddingHorizontal: 4, paddingBottom: 4 },
});
