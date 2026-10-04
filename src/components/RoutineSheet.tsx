import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/motion';
import { useSettings } from '@/lib/settings';
import type { Phase } from '@/lib/supabase';
import { font } from '@/lib/theme';
import { PHASE_COLORS, PRESETS } from '@/lib/timer';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { Icon, icons } from './Icon';
import { Pressy } from './Pressy';

type Draft = { label: string; min: string; sec: string };

const toDraft = (p: Phase): Draft => ({ label: p.label, min: String(Math.floor(p.seconds / 60)), sec: String(p.seconds % 60) });
const toPhase = (d: Draft): Phase => ({
  label: d.label.trim() || 'Fase',
  seconds: Math.min(Math.max((parseInt(d.min, 10) || 0) * 60 + (parseInt(d.sec, 10) || 0), 5), 4 * 3600),
});

// Editar la rutina: fases (qué y cuánto) y cuántas vueltas.
export function RoutineSheet({
  visible,
  phases,
  rounds,
  onClose,
  onSave,
}: {
  visible: boolean;
  phases: Phase[];
  rounds: number;
  onClose: () => void;
  onSave: (phases: Phase[], rounds: number) => void;
}) {
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [laps, setLaps] = useState(rounds);

  useEffect(() => {
    if (!visible) return;
    setDrafts(phases.map(toDraft));
    setLaps(rounds);
  }, [visible, phases, rounds]);

  const edit = (i: number, patch: Partial<Draft>) => setDrafts((d) => d.map((x, n) => (n === i ? { ...x, ...patch } : x)));

  const field = [styles.input, { color: pal.sheetText, backgroundColor: pal.field, borderColor: pal.line }];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: pal.sheet, paddingBottom: 20 + Math.max(insets.bottom, keyboardHeight) }]}>
          <View style={[styles.grabber, { backgroundColor: pal.line }]} />
          <View style={styles.head}>
            <Text style={[styles.title, { color: pal.sheetText }]}>Rutina</Text>
            <Pressy onPress={onClose} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Cerrar" style={[styles.close, { borderColor: pal.line }]}>
              <Icon d={icons.close} size={18} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets} style={{ flexGrow: 0 }}>
            {PRESETS.map((p) => (
              <Pressy
                key={p.name}
                onPress={() => {
                  haptic.select();
                  setDrafts(p.phases.map(toDraft));
                  setLaps(p.rounds);
                }}
                scaleTo={0.95}
                accessibilityRole="button"
                style={[styles.preset, { borderColor: pal.accent }]}
              >
                <Text style={[styles.presetText, { color: pal.accent }]}>{p.name}</Text>
              </Pressy>
            ))}
          </ScrollView>

          <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {drafts.map((d, i) => (
              <View key={i} style={styles.phaseRow}>
                <View style={[styles.swatch, { backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }]} />
                <TextInput value={d.label} onChangeText={(label) => edit(i, { label })} placeholder="Qué" placeholderTextColor={pal.sheetMuted} style={[field, { flex: 1 }]} accessibilityLabel={`Nombre de la fase ${i + 1}`} />
                <TextInput value={d.min} onChangeText={(min) => edit(i, { min: min.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={3} style={[field, styles.num]} accessibilityLabel="Minutos" />
                <Text style={[styles.unit, { color: pal.sheetMuted }]}>min</Text>
                <TextInput value={d.sec} onChangeText={(sec) => edit(i, { sec: sec.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={2} style={[field, styles.num]} accessibilityLabel="Segundos" />
                <Text style={[styles.unit, { color: pal.sheetMuted }]}>s</Text>
                <Pressy
                  onPress={() => setDrafts((all) => all.filter((_, n) => n !== i))}
                  disabled={drafts.length <= 1}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${d.label}`}
                  style={[styles.remove, { opacity: drafts.length <= 1 ? 0.3 : 1 }]}
                >
                  <Icon d={icons.close} size={16} color={pal.sheetMuted} strokeWidth={2.4} />
                </Pressy>
              </View>
            ))}
            {drafts.length < PHASE_COLORS.length && (
              <Pressy onPress={() => setDrafts((all) => [...all, { label: '', min: '5', sec: '0' }])} scaleTo={0.97} accessibilityRole="button" style={styles.addPhase}>
                <Icon d={icons.plus} size={18} color={pal.accent} strokeWidth={2.4} />
                <Text style={[styles.addPhaseText, { color: pal.accent }]}>Añadir fase</Text>
              </Pressy>
            )}
          </ScrollView>

          <View style={[styles.lapsRow, { backgroundColor: pal.field, borderColor: pal.line }]}>
            <Text style={[styles.lapsLabel, { color: pal.sheetText }]}>Vueltas</Text>
            <Pressy onPress={() => setLaps((l) => Math.max(1, l - 1))} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Una vuelta menos" style={[styles.step, { borderColor: pal.line }]}>
              <Icon d={icons.minus} size={18} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
            <Text style={[styles.lapsValue, { color: pal.sheetText }]}>{laps}</Text>
            <Pressy onPress={() => setLaps((l) => Math.min(20, l + 1))} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Una vuelta más" style={[styles.step, { borderColor: pal.line }]}>
              <Icon d={icons.plus} size={18} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
          </View>

          <Pressy
            onPress={() => {
              haptic.success();
              onSave(drafts.map(toPhase), laps);
            }}
            style={[styles.save, { backgroundColor: pal.accent }]}
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>Guardar rutina</Text>
          </Pressy>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,14,34,0.35)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontFamily: font.display, letterSpacing: -0.3 },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presets: { gap: 8 },
  preset: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center' },
  presetText: { fontSize: 14, fontFamily: font.heavy },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 32, borderRadius: 4 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15, fontFamily: font.body },
  num: { width: 48, textAlign: 'center', paddingHorizontal: 4, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontFamily: font.body },
  remove: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  addPhase: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 4 },
  addPhaseText: { fontSize: 15, fontFamily: font.heavy },
  lapsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  lapsLabel: { flex: 1, fontSize: 16, fontFamily: font.bold },
  lapsValue: { minWidth: 28, textAlign: 'center', fontSize: 20, fontFamily: font.heavy, fontVariant: ['tabular-nums'] },
  step: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  save: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 16 },
});
