import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { RoundButton } from '@/components/RoundButton';
import { addMemory, loadMemories, markMemoriesSeen } from '@/lib/memories';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { Memory, supabase } from '@/lib/supabase';

type Item = Memory & { url?: string };
const STEP = 190;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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

export default function Recuerdos() {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[] | null>(null);
  const [adding, setAdding] = useState(false);

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
  const ordered = items ? [...items].reverse() : [];

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <View style={[styles.header, { paddingTop: insets.top + 96 }]}>
        <Text style={[styles.kicker, { color: pal.muted }]}>{`TÚ Y ${(partner?.name ?? 'TU PAREJA').toUpperCase()}`}</Text>
        <Text style={[styles.title, { color: pal.text }]}>Nuestra enredadera</Text>
      </View>
      {items === null ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          <View style={{ height: Math.max(ordered.length, 1) * STEP + 120 }}>
            <Vine count={ordered.length} color={pal.vine} leaf={pal.leaf} pot={pal.pot} />
            {ordered.length === 0 && (
              <Glass strong style={[styles.card, { left: 120, top: 20 }]}>
                <Text style={[styles.cardText, { color: pal.text }]}>Aún no hay recuerdos. ¡Planta el primero!</Text>
              </Glass>
            )}
            {ordered.map((m, i) => {
              const top = (ordered.length - 1 - i) * STEP + 10;
              const left = i % 2 === 0 ? 16 : undefined;
              const right = i % 2 === 1 ? 16 : undefined;
              return (
                <Glass key={m.id} strong style={[styles.card, { top, left, right }, i === ordered.length - 1 && { borderColor: pal.accent, borderWidth: 2.5 }]}>
                  {m.url ? <Image source={{ uri: m.url }} style={styles.photo} /> : <View style={[styles.photo, { backgroundColor: pal.glass }]} />}
                  <Text style={[styles.cardText, { color: pal.text }]}>{m.text}</Text>
                  <Text style={[styles.meta, { color: pal.muted }]}>
                    {nameOf(m.author_id)} · {formatDate(m.created_at)}
                  </Text>
                </Glass>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={[styles.bottom, { bottom: insets.bottom + 24 }]}>
        <RoundButton icon={icons.home} size={56} onPress={() => router.back()} />
        <Pressable onPress={() => setAdding(true)} style={[styles.add, { backgroundColor: pal.accent }]} accessibilityRole="button">
          <Icon d={icons.plus} size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addText}>Añadir recuerdo</Text>
        </Pressable>
      </View>

      <AddMemory
        visible={adding}
        onClose={() => setAdding(false)}
        onSave={async (text, image) => {
          await addMemory(me.couple_id!, me.id, text, image);
          setAdding(false);
          load();
        }}
      />
    </View>
  );
}

function AddMemory({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string, image?: { uri: string; mimeType?: string | null }) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
    if (!res.canceled) setImage(res.assets[0]);
  };

  const save = async () => {
    if (!text.trim() && !image) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(text.trim(), image ?? undefined);
      setText('');
      setImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
    setBusy(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Nuevo recuerdo</Text>
          <Pressable onPress={pick} style={styles.picker} accessibilityRole="button" accessibilityLabel="Elegir foto">
            {image ? (
              <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <>
                <Icon d={icons.image} size={32} color="#9C2F55" />
                <Text style={styles.pickerText}>Elegir foto</Text>
              </>
            )}
          </Pressable>
          <TextInput value={text} onChangeText={setText} placeholder="¿Qué pasó?" placeholderTextColor="#8A6E7A" style={styles.textarea} multiline />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable onPress={save} disabled={busy} style={styles.save} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addText}>Guardar en la enredadera</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  kicker: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: '800' },
  card: { position: 'absolute', width: 160, borderRadius: 18, padding: 8, gap: 6 },
  photo: { height: 96, borderRadius: 12 },
  cardText: { fontSize: 16, fontWeight: '700', fontStyle: 'italic' },
  meta: { fontSize: 11, fontWeight: '700' },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { height: 56, paddingHorizontal: 22, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(40,20,45,0.3)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, gap: 14 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#2E1A28' },
  picker: { height: 180, borderRadius: 18, backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  pickerText: { color: '#9C2F55', fontWeight: '800' },
  textarea: { minHeight: 80, borderRadius: 16, borderWidth: 1.5, borderColor: '#EAD6D0', padding: 14, fontSize: 16, color: '#2E1A28', textAlignVertical: 'top' },
  save: { height: 54, borderRadius: 27, backgroundColor: '#B0345E', alignItems: 'center', justifyContent: 'center' },
  error: { color: '#B3261E', fontWeight: '700' },
});
