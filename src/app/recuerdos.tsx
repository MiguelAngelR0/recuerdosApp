import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { Pressy } from '@/components/Pressy';
import { RoundButton } from '@/components/RoundButton';
import { MemorySheet } from '@/components/MemorySheet';
import { SortableMemories } from '@/components/SortableMemories';
import { addMemory, deleteMemory, formatMemoryDate, loadMemories, markMemoriesSeen, MemoryItem, reorderMemories, updateMemory } from '@/lib/memories';
import { EASE_OUT, haptic } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { font } from '@/lib/theme';

const STEP = 190;

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

export default function Recuerdos() {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  // null = cerrada, 'new' = nuevo recuerdo, o el recuerdo que se edita.
  const [sheet, setSheet] = useState<MemoryItem | 'new' | null>(null);
  const [sorting, setSorting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(() => {
    loadMemories().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    markMemoriesSeen();
    if (!me?.couple_id) return;
    const channel = supabase
      .channel(`memories-${me.couple_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `couple_id=eq.${me.couple_id}` }, () => {
        load();
        markMemoriesSeen();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, me?.couple_id]);

  if (!me) return null;
  const nameOf = (id: string) => (id === me.id ? 'Tú' : partner?.name ?? 'Tu pareja');
  const list = items ?? [];
  const ordered = [...list].reverse(); // de abajo (maceta) arriba

  const reorder = (ids: string[]) => {
    setItems((prev) => (prev ? ids.map((id) => prev.find((m) => m.id === id)!).filter(Boolean) : prev));
    reorderMemories(ids).catch(() => load());
  };

  const editing = sheet && sheet !== 'new' ? sheet : null;

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: pal.text }]}>{sorting ? 'Ordenar' : 'Nuestra enredadera'}</Text>
          <Text style={[styles.subtitle, { color: pal.muted }]}>
            {sorting
              ? 'Arrastra desde los puntitos o usa las flechas. Arriba es lo más alto de la planta.'
              : list.length > 0
                ? `${list.length} recuerdo${list.length === 1 ? '' : 's'} de ti y ${partner?.name ?? 'tu pareja'}`
                : `Tú y ${partner?.name ?? 'tu pareja'}`}
          </Text>
        </View>
        {list.length > 1 && !sorting && (
          <RoundButton icon={icons.sort} label="Ordenar recuerdos" showLabel={false} size={48} onPress={() => setSorting(true)} />
        )}
      </View>

      {items === null ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />
      ) : sorting ? (
        <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 + insets.bottom }}>
          <SortableMemories items={list} onReorder={reorder} onDragChange={setDragging} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          <View style={{ height: Math.max(ordered.length, 1) * STEP + 120 }}>
            <Vine count={ordered.length} color={pal.vine} leaf={pal.leaf} pot={pal.pot} />
            {ordered.length === 0 && (
              <Glass strong style={[styles.card, { left: 115, top: 20 }]}>
                <Text style={[styles.cardText, { color: pal.text }]}>Aún no hay recuerdos. Planta el primero con una foto.</Text>
              </Glass>
            )}
            {ordered.map((m, i) => {
              const top = (ordered.length - 1 - i) * STEP + 10;
              const left = i % 2 === 0 ? 16 : undefined;
              const right = i % 2 === 1 ? 16 : undefined;
              return (
                <Animated.View
                  key={m.id}
                  entering={FadeInDown.duration(320)
                    .easing(EASE_OUT)
                    .delay(Math.min(ordered.length - 1 - i, 6) * 50)}
                  style={[styles.cardWrap, { top, left, right }]}
                >
                  <Pressy
                    onPress={() => {
                      haptic.light();
                      setSheet(m);
                    }}
                    scaleTo={0.97}
                    accessibilityRole="button"
                    accessibilityLabel={`${m.text || 'Recuerdo'}, ${formatMemoryDate(m)}. Toca para editar`}
                  >
                    <Glass strong style={[styles.cardInner, i === ordered.length - 1 && { borderColor: pal.accent, borderWidth: 2 }]}>
                      {m.url ? <Image source={{ uri: m.url }} style={styles.photo} /> : null}
                      {m.text ? (
                        <Text style={[styles.cardText, { color: pal.text }]} numberOfLines={4}>
                          {m.text}
                        </Text>
                      ) : null}
                      <Text style={[styles.meta, { color: pal.muted }]}>
                        {formatMemoryDate(m)} · {nameOf(m.author_id)}
                      </Text>
                    </Glass>
                  </Pressy>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={[styles.bottom, { bottom: insets.bottom + 20 }]}>
        {sorting ? (
          <Pressy
            onPress={() => {
              haptic.light();
              setSorting(false);
            }}
            style={[styles.add, styles.done, { backgroundColor: pal.accent }]}
            accessibilityRole="button"
          >
            <Text style={styles.addText}>Listo</Text>
          </Pressy>
        ) : (
          <>
            <RoundButton icon={icons.home} label="Inicio" showLabel={false} size={52} onPress={() => router.back()} />
            <Pressy
              onPress={() => {
                haptic.light();
                setSheet('new');
              }}
              style={[styles.add, { backgroundColor: pal.accent }]}
              accessibilityRole="button"
            >
              <Icon d={icons.plus} size={20} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addText}>Añadir recuerdo</Text>
            </Pressy>
          </>
        )}
      </View>

      <MemorySheet
        visible={sheet !== null}
        memory={editing}
        onClose={() => setSheet(null)}
        onSave={async (fields) => {
          if (editing) await updateMemory(editing, fields);
          else await addMemory(me.couple_id!, me.id, fields);
          setSheet(null);
          load();
        }}
        onDelete={async (m) => {
          await deleteMemory(m);
          haptic.success();
          setSheet(null);
          load();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 34, fontFamily: font.display, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 20, fontFamily: font.body },
  card: { position: 'absolute', width: 160, borderRadius: 16, padding: 12 },
  cardWrap: { position: 'absolute', width: 160 },
  cardInner: { borderRadius: 16, padding: 8, gap: 6 },
  photo: { height: 104, borderRadius: 10 },
  cardText: { fontSize: 15, lineHeight: 20, fontFamily: font.bold, paddingHorizontal: 4 },
  meta: { fontSize: 12, fontFamily: font.body, paddingHorizontal: 4, paddingBottom: 4 },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { height: 52, paddingHorizontal: 24, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  done: { flex: 1 },
  addText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 16 },
});
