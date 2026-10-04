import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoryItem, PickedImage, toISODate } from '@/lib/memories';
import { haptic } from '@/lib/motion';
import { useSettings } from '@/lib/settings';
import { font } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { Icon, icons } from './Icon';
import { Pressy } from './Pressy';

export type MemoryFields = { text: string; happenedOn: string | null; image?: PickedImage };

// Los errores de Supabase no siempre son `Error`: se lee su mensaje y su pista igualmente.
function errorText(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) {
    const { message, hint } = e as { message?: string; hint?: string };
    return [message, hint].filter(Boolean).join(' ');
  }
  return 'Revisa la conexión e inténtalo otra vez.';
}

function longDate(d: Date) {
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Una sola hoja para crear y para editar: con `memory` se edita, sin ella se crea.
export function MemorySheet({
  visible,
  memory,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  memory: MemoryItem | null;
  onClose: () => void;
  onSave: (fields: MemoryFields) => Promise<void>;
  onDelete: (m: MemoryItem) => Promise<void>;
}) {
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [text, setText] = useState('');
  const [date, setDate] = useState(new Date());
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir, rellena con el recuerdo que se edita (o vacío si es nuevo).
  useEffect(() => {
    if (!visible) return;
    setText(memory?.text ?? '');
    setDate(memory?.happened_on ? new Date(`${memory.happened_on}T12:00:00`) : memory ? new Date(memory.created_at) : new Date());
    setImage(null);
    setError(null);
  }, [visible, memory]);

  const preview = image?.uri ?? memory?.url;
  const canSave = !!text.trim() || !!preview;

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, base64: true });
    if (!res.canceled) setImage(res.assets[0]);
  };

  const pickDate = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode: 'date', maximumDate: new Date(), onValueChange: (_e, d) => setDate(d) });
    }
  };

  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({ text: text.trim(), happenedOn: toISODate(date), image: image ?? undefined });
      haptic.success();
    } catch (e) {
      haptic.error();
      setError(`No se pudo guardar: ${errorText(e)}`);
    }
    setBusy(false);
  };

  const confirmDelete = () => {
    if (!memory) return;
    haptic.medium();
    Alert.alert('¿Borrar este recuerdo?', 'Se borrará para los dos y no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onDelete(memory);
          } catch (e) {
            setError(`No se pudo borrar: ${errorText(e)}`);
          }
          setBusy(false);
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { backgroundColor: pal.sheet, paddingBottom: 20 + Math.max(insets.bottom, keyboardHeight) }]}>
          <View style={[styles.grabber, { backgroundColor: pal.line }]} />
          <View style={styles.head}>
            <Text style={[styles.title, { color: pal.sheetText }]}>{memory ? 'Editar recuerdo' : 'Nuevo recuerdo'}</Text>
            <Pressy onPress={onClose} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Cerrar" style={[styles.close, { borderColor: pal.line }]}>
              <Icon d={icons.close} size={18} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
          </View>

          <Pressy
            onPress={pick}
            scaleTo={0.98}
            style={[styles.picker, { backgroundColor: pal.field, borderColor: pal.line }]}
            accessibilityRole="button"
            accessibilityLabel={preview ? 'Cambiar foto' : 'Elegir foto'}
          >
            {preview ? (
              <>
                <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} />
                <View style={styles.changeChip}>
                  <Text style={styles.changeText}>Cambiar foto</Text>
                </View>
              </>
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

          <View style={[styles.dateRow, { backgroundColor: pal.field, borderColor: pal.line }]}>
            <Icon d={icons.calendar} size={20} color={pal.icon} />
            <Text style={[styles.dateLabel, { color: pal.sheetMuted }]}>Cuándo fue</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker value={date} mode="date" display="compact" maximumDate={new Date()} locale="es-ES" accentColor={pal.accent} onValueChange={(_e, d) => setDate(d)} />
            ) : (
              <Pressy onPress={pickDate} scaleTo={0.96} accessibilityRole="button" accessibilityLabel={`Fecha: ${longDate(date)}. Toca para cambiarla`} style={styles.dateValueWrap}>
                <Text style={[styles.dateValue, { color: pal.accent }]} numberOfLines={1}>
                  {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </Pressy>
            )}
          </View>

          {error && <Text style={[styles.error, { color: pal.danger }]}>{error}</Text>}

          <Pressy
            onPress={save}
            disabled={busy || !canSave}
            style={[styles.save, { backgroundColor: pal.accent, opacity: canSave ? 1 : 0.45 }]}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>{memory ? 'Guardar cambios' : 'Guardar en la enredadera'}</Text>}
          </Pressy>

          {memory && (
            <Pressy onPress={confirmDelete} disabled={busy} scaleTo={0.97} accessibilityRole="button" style={styles.delete}>
              <Icon d={icons.trash} size={18} color={pal.danger} />
              <Text style={[styles.deleteText, { color: pal.danger }]}>Borrar recuerdo</Text>
            </Pressy>
          )}
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
  picker: { height: 176, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  pickerText: { fontFamily: font.heavy, fontSize: 15 },
  changeChip: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(30,14,34,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 13 },
  textarea: { minHeight: 80, maxHeight: 160, borderRadius: 16, borderWidth: 1, padding: 16, fontSize: 16, fontFamily: font.body, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  dateLabel: { flex: 1, fontSize: 16, fontFamily: font.bold },
  dateValueWrap: { minHeight: 44, justifyContent: 'center' },
  dateValue: { fontSize: 16, fontFamily: font.heavy },
  save: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 16 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44 },
  deleteText: { fontFamily: font.heavy, fontSize: 15 },
  error: { fontFamily: font.bold, fontSize: 14 },
});
