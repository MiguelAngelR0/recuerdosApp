import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { Pressy } from '@/components/Pressy';
import { RoundButton } from '@/components/RoundButton';
import { addMemory, loadMemories, markMemoriesSeen } from '@/lib/memories';
import { EASE_OUT, haptic } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { Memory, supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { font } from '@/lib/theme';

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
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={[styles.title, { color: pal.text }]}>Nuestra enredadera</Text>
        <Text style={[styles.subtitle, { color: pal.muted }]}>
          {items && items.length > 0 ? `${items.length} recuerdo${items.length === 1 ? '' : 's'} de ti y ${partner?.name ?? 'tu pareja'}` : `Tú y ${partner?.name ?? 'tu pareja'}`}
        </Text>
      </View>
      {items === null ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />
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
                  <Glass strong style={[styles.cardInner, i === ordered.length - 1 && { borderColor: pal.accent, borderWidth: 2 }]}>
                    {m.url ? (
                      <Image source={{ uri: m.url }} style={styles.photo} accessibilityLabel={m.text || 'Foto del recuerdo'} />
                    ) : null}
                    {m.text ? <Text style={[styles.cardText, { color: pal.text }]}>{m.text}</Text> : null}
                    <Text style={[styles.meta, { color: pal.muted }]}>
                      {nameOf(m.author_id)} · {formatDate(m.created_at)}
                    </Text>
                  </Glass>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={[styles.bottom, { bottom: insets.bottom + 20 }]}>
        <RoundButton icon={icons.home} label="Inicio" showLabel={false} size={52} onPress={() => router.back()} />
        <Pressy
          onPress={() => {
            haptic.light();
            setAdding(true);
          }}
          style={[styles.add, { backgroundColor: pal.accent }]}
          accessibilityRole="button"
        >
          <Icon d={icons.plus} size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addText}>Añadir recuerdo</Text>
        </Pressy>
      </View>

      <AddMemory
        visible={adding}
        onClose={() => setAdding(false)}
        onSave={async (text, image) => {
          await addMemory(me.couple_id!, me.id, text, image);
          haptic.success();
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
  onSave: (text: string, image?: { base64?: string | null; mimeType?: string | null }) => Promise<void>;
}) {
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, base64: true });
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
      haptic.error();
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar. Revisa la conexión e inténtalo otra vez.');
    }
    setBusy(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: pal.sheet, paddingBottom: 20 + Math.max(insets.bottom, keyboardHeight) }]}>
          <View style={[styles.grabber, { backgroundColor: pal.line }]} />
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: pal.sheetText }]}>Nuevo recuerdo</Text>
            <Pressy onPress={onClose} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Cerrar" style={[styles.close, { borderColor: pal.line }]}>
              <Icon d={icons.close} size={18} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
          </View>
          <Pressy onPress={pick} scaleTo={0.98} style={[styles.picker, { backgroundColor: pal.field, borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel={image ? 'Cambiar foto' : 'Elegir foto'}>
            {image ? (
              <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <>
                <Icon d={icons.image} size={30} color={pal.icon} />
                <Text style={[styles.pickerText, { color: pal.icon }]}>Elegir foto</Text>
              </>
            )}
          </Pressy>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="¿Qué pasó?"
            placeholderTextColor={pal.sheetMuted}
            selectionColor={pal.accent}
            style={[styles.textarea, { color: pal.sheetText, backgroundColor: pal.field, borderColor: pal.line }]}
            multiline
          />
          {error && <Text style={[styles.error, { color: pal.danger }]}>{error}</Text>}
          <Pressy onPress={save} disabled={busy || (!text.trim() && !image)} style={[styles.save, { backgroundColor: pal.accent, opacity: !text.trim() && !image ? 0.45 : 1 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addText}>Guardar en la enredadera</Text>}
          </Pressy>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 2 },
  title: { fontSize: 34, fontFamily: font.display, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: font.body },
  card: { position: 'absolute', width: 160, borderRadius: 16, padding: 12 },
  cardWrap: { position: 'absolute', width: 160 },
  cardInner: { borderRadius: 16, padding: 8, gap: 6 },
  photo: { height: 104, borderRadius: 10 },
  cardText: { fontSize: 15, lineHeight: 20, fontFamily: font.bold, paddingHorizontal: 2 },
  meta: { fontSize: 12, fontFamily: font.body, paddingHorizontal: 2, paddingBottom: 2 },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { height: 52, paddingHorizontal: 22, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 16 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,14,34,0.35)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 24, fontFamily: font.display, letterSpacing: -0.3 },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  picker: { height: 180, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  pickerText: { fontFamily: font.heavy, fontSize: 15 },
  textarea: { minHeight: 88, borderRadius: 16, borderWidth: 1, padding: 14, fontSize: 16, fontFamily: font.body, textAlignVertical: 'top' },
  save: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: font.bold, fontSize: 14 },
});
