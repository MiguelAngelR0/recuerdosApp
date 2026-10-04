import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { Pressy } from '@/components/Pressy';
import { RoundButton } from '@/components/RoundButton';
import { EASE_OUT, haptic } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase, Todo } from '@/lib/supabase';
import { font } from '@/lib/theme';

type Filter = 'todas' | 'pendientes' | 'mias';
const FILTERS: [Filter, string][] = [
  ['todas', 'Todas'],
  ['pendientes', 'Pendientes'],
  ['mias', 'Mías'],
];

const reflow = LinearTransition.duration(220).easing(EASE_OUT);

export default function Tareas() {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [filter, setFilter] = useState<Filter>('todas');
  const [text, setText] = useState('');

  // La barra de escribir sube con el teclado, en iOS y en Android.
  const keyboard = useAnimatedKeyboard();
  const bottomInset = insets.bottom;
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.get() - bottomInset) }],
  }));

  const load = useCallback(async () => {
    const { data } = await supabase.from('todos').select('*').order('done').order('created_at', { ascending: false }).returns<Todo[]>();
    setTodos(data ?? []);
  }, []);

  useEffect(() => {
    load();
    if (!me?.couple_id) return;
    const channel = supabase
      .channel(`todos-${me.couple_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `couple_id=eq.${me.couple_id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, me?.couple_id]);

  if (!me) return null;

  const all = todos ?? [];
  const visible = all.filter((t) => (filter === 'todas' ? true : filter === 'pendientes' ? !t.done : t.assigned_to === me.id || t.assigned_to === null));
  const pending = all.filter((t) => !t.done).length;

  const add = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    haptic.light();
    await supabase.from('todos').insert({ couple_id: me.couple_id, author_id: me.id, text: value, assigned_to: null });
    load();
  };

  const toggle = async (t: Todo) => {
    haptic.light();
    setTodos((list) => list?.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) ?? null);
    await supabase.from('todos').update({ done: !t.done }).eq('id', t.id);
  };

  // Al tocar la etiqueta, la tarea pasa de "Los dos" → "Tú" → "Tu pareja".
  const cycleOwner = async (t: Todo) => {
    haptic.select();
    const order = [null, me.id, partner?.id ?? null];
    const next = order[(order.indexOf(t.assigned_to) + 1) % order.length];
    setTodos((list) => list?.map((x) => (x.id === t.id ? { ...x, assigned_to: next } : x)) ?? null);
    await supabase.from('todos').update({ assigned_to: next }).eq('id', t.id);
  };

  const remove = async (t: Todo) => {
    haptic.medium();
    setTodos((list) => list?.filter((x) => x.id !== t.id) ?? null);
    await supabase.from('todos').delete().eq('id', t.id);
  };

  const ownerLabel = (t: Todo) => (t.assigned_to === null ? 'Los dos' : t.assigned_to === me.id ? 'Tú' : partner?.name ?? 'Pareja');
  const ownerTint = (t: Todo) =>
    t.assigned_to === null ? 'rgba(249,180,200,0.5)' : t.assigned_to === me.id ? 'rgba(255,213,79,0.45)' : 'rgba(141,110,99,0.3)';

  const empty =
    todos === null ? null : all.length === 0 ? 'Aún no hay tareas. Escribe la primera abajo.' : filter === 'pendientes' ? 'Todo hecho. Buen trabajo.' : 'No hay tareas aquí.';

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: pal.text }]}>Tareas</Text>
          {todos !== null && <Text style={[styles.count, { color: pal.muted }]}>{pending === 0 ? 'Nada pendiente' : `${pending} pendiente${pending === 1 ? '' : 's'}`}</Text>}
        </View>
        <Glass style={styles.segment}>
          {FILTERS.map(([id, label]) => {
            const on = id === filter;
            return (
              <Pressy
                key={id}
                onPress={() => {
                  if (!on) haptic.select();
                  setFilter(id);
                }}
                scaleTo={0.97}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.segmentItem, on && { backgroundColor: pal.accent }]}
              >
                <Text style={[styles.segmentText, { color: on ? '#FFFFFF' : pal.text }]}>{label}</Text>
              </Pressy>
            );
          })}
        </Glass>
      </View>

      <Animated.FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        itemLayoutAnimation={reflow}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 120 + insets.bottom }}
        ListEmptyComponent={empty ? <Text style={[styles.empty, { color: pal.muted }]}>{empty}</Text> : null}
        ListFooterComponent={visible.length > 0 ? <Text style={[styles.tip, { color: pal.muted }]}>Desliza una tarea a la izquierda para borrarla</Text> : null}
        renderItem={({ item }) => (
          <Swipeable
            friction={1.6}
            rightThreshold={48}
            overshootRight={false}
            containerStyle={styles.swipe}
            renderRightActions={() => (
              <Pressy onPress={() => remove(item)} accessibilityRole="button" accessibilityLabel={`Borrar ${item.text}`} style={[styles.delete, { backgroundColor: pal.danger }]}>
                <Icon d={icons.trash} size={20} color={pal.sheet} />
                <Text style={[styles.deleteText, { color: pal.sheet }]}>Borrar</Text>
              </Pressy>
            )}
          >
            <Glass strong style={styles.row}>
              <Pressy
                onPress={() => toggle(item)}
                scaleTo={0.98}
                style={styles.rowMain}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done }}
                accessibilityActions={[{ name: 'delete', label: 'Borrar' }]}
                onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && remove(item)}
              >
                <View style={[styles.box, { borderColor: pal.icon, backgroundColor: item.done ? pal.icon : 'transparent' }]}>
                  {item.done && (
                    <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(100)}>
                      <Icon d="M5 12l5 5 9-10" size={15} color="#FFFFFF" strokeWidth={3} />
                    </Animated.View>
                  )}
                </View>
                <Text style={[styles.rowText, { color: item.done ? pal.muted : pal.text, textDecorationLine: item.done ? 'line-through' : 'none' }]}>{item.text}</Text>
              </Pressy>
              <Pressy onPress={() => cycleOwner(item)} hitSlop={8} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={`Asignada a ${ownerLabel(item)}. Toca para cambiar`}>
                <Text style={[styles.owner, { color: pal.text, backgroundColor: ownerTint(item) }]}>{ownerLabel(item)}</Text>
              </Pressy>
            </Glass>
          </Swipeable>
        )}
      />

      <Animated.View style={[styles.bottom, { bottom: insets.bottom + 20 }, barStyle]}>
        <RoundButton icon={icons.home} label="Inicio" showLabel={false} size={52} onPress={() => router.back()} />
        <Glass strong style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            submitBehavior="submit"
            placeholder="Añadir una tarea…"
            placeholderTextColor={pal.muted}
            selectionColor={pal.accent}
            style={[styles.input, { color: pal.text }]}
            returnKeyType="done"
          />
        </Glass>
        <Pressy
          onPress={add}
          disabled={!text.trim()}
          scaleTo={0.9}
          style={[styles.addBtn, { backgroundColor: pal.accent, opacity: text.trim() ? 1 : 0.45 }]}
          accessibilityRole="button"
          accessibilityLabel="Añadir tarea"
        >
          <Icon d={icons.plus} size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Pressy>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 34, fontFamily: font.display, letterSpacing: -0.5 },
  count: { fontSize: 14, fontFamily: font.bold },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 22, gap: 4 },
  segmentItem: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontFamily: font.heavy },
  swipe: { borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, minHeight: 60 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 16, lineHeight: 21, fontFamily: font.bold },
  owner: { fontSize: 12, fontFamily: font.heavy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  delete: { width: 92, marginLeft: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  deleteText: { fontSize: 12, fontFamily: font.heavy },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, fontFamily: font.bold },
  tip: { textAlign: 'center', marginTop: 10, fontSize: 12, fontFamily: font.body },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrap: { flex: 1, height: 52, borderRadius: 26, justifyContent: 'center' },
  input: { paddingHorizontal: 18, fontSize: 16, height: 52, fontFamily: font.body },
  addBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
