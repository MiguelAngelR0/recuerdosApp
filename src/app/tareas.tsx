import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { RoundButton } from '@/components/RoundButton';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase, Todo } from '@/lib/supabase';

type Filter = 'todas' | 'pendientes' | 'mias';
const FILTERS: [Filter, string][] = [
  ['todas', 'Todas'],
  ['pendientes', 'Pendientes'],
  ['mias', 'Mías'],
];

export default function Tareas() {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>('todas');
  const [text, setText] = useState('');

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

  const visible = todos.filter((t) => (filter === 'todas' ? true : filter === 'pendientes' ? !t.done : t.assigned_to === me.id || t.assigned_to === null));

  const add = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    await supabase.from('todos').insert({ couple_id: me.couple_id, author_id: me.id, text: value, assigned_to: null });
    load();
  };

  const toggle = async (t: Todo) => {
    setTodos((list) => list.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from('todos').update({ done: !t.done }).eq('id', t.id);
  };

  // Al tocar la etiqueta, la tarea pasa de "Los dos" → "Tú" → "Tu pareja".
  const cycleOwner = async (t: Todo) => {
    const order = [null, me.id, partner?.id ?? null];
    const next = order[(order.indexOf(t.assigned_to) + 1) % order.length];
    setTodos((list) => list.map((x) => (x.id === t.id ? { ...x, assigned_to: next } : x)));
    await supabase.from('todos').update({ assigned_to: next }).eq('id', t.id);
  };

  const remove = async (t: Todo) => {
    setTodos((list) => list.filter((x) => x.id !== t.id));
    await supabase.from('todos').delete().eq('id', t.id);
  };

  const ownerLabel = (t: Todo) => (t.assigned_to === null ? 'Los dos' : t.assigned_to === me.id ? 'Tú' : partner?.name ?? 'Pareja');
  const ownerTint = (t: Todo) =>
    t.assigned_to === null ? 'rgba(249,180,200,0.55)' : t.assigned_to === me.id ? 'rgba(255,213,79,0.45)' : 'rgba(141,110,99,0.35)';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Background />
      <View style={[styles.header, { paddingTop: insets.top + 96 }]}>
        <Text style={[styles.title, { color: pal.text }]}>Tareas</Text>
        <View style={styles.filters}>
          {FILTERS.map(([id, label]) => {
            const on = id === filter;
            return (
              <Pressable key={id} onPress={() => setFilter(id)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Glass style={[styles.pill, on && { backgroundColor: pal.accent }]}>
                  <Text style={[styles.pillText, { color: on ? '#FFFFFF' : pal.text }]}>{label}</Text>
                </Glass>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 120 + insets.bottom }}
        ListEmptyComponent={<Text style={[styles.empty, { color: pal.muted }]}>Nada pendiente. ¡Bien hecho!</Text>}
        renderItem={({ item }) => (
          <Glass strong style={styles.row}>
            <Pressable onPress={() => toggle(item)} onLongPress={() => remove(item)} style={styles.rowMain} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}>
              <View style={[styles.box, { borderColor: pal.icon, backgroundColor: item.done ? pal.icon : 'transparent' }]}>
                {item.done && <Icon d="M5 12l5 5 9-10" size={16} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={[styles.rowText, { color: item.done ? pal.muted : pal.text, textDecorationLine: item.done ? 'line-through' : 'none' }]}>{item.text}</Text>
            </Pressable>
            <Pressable onPress={() => cycleOwner(item)} accessibilityRole="button" accessibilityLabel={`Asignada a ${ownerLabel(item)}`}>
              <Text style={[styles.owner, { color: pal.text, backgroundColor: ownerTint(item), borderColor: pal.glassBorder }]}>{ownerLabel(item)}</Text>
            </Pressable>
          </Glass>
        )}
      />
      <View style={[styles.bottom, { bottom: insets.bottom + 24 }]}>
        <RoundButton icon={icons.home} size={56} onPress={() => router.back()} />
        <Glass strong style={styles.inputWrap}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={add} placeholder="Añadir una tarea…" placeholderTextColor={pal.muted} style={[styles.input, { color: pal.text }]} returnKeyType="done" />
        </Glass>
        <Pressable onPress={add} style={[styles.addBtn, { backgroundColor: pal.accent }]} accessibilityLabel="Añadir tarea">
          <Icon d={icons.plus} size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  title: { fontSize: 28, fontWeight: '800' },
  filters: { flexDirection: 'row', gap: 8 },
  pill: { height: 38, paddingHorizontal: 16, borderRadius: 19, justifyContent: 'center' },
  pillText: { fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: 14, minHeight: 60 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 15, fontWeight: '700' },
  owner: { fontSize: 12, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  empty: { textAlign: 'center', marginTop: 30, fontWeight: '700' },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrap: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center' },
  input: { paddingHorizontal: 18, fontSize: 15, height: 50 },
  addBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
