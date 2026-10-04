import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { font, palettes, ThemeId } from '@/lib/theme';
import { Icon, icons } from './Icon';
import { Pressy } from './Pressy';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, setTheme, flowers, setFlowers, pal } = useSettings();
  const { coupleCode, partner, me, refresh } = useSession();
  const swap = async () => {
    haptic.select();
    await supabase.rpc('swap_characters');
    await refresh();
  };
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar ajustes" />
        <View style={[styles.sheet, { backgroundColor: pal.sheet, paddingBottom: 20 + insets.bottom }]}>
          <View style={[styles.grabber, { backgroundColor: pal.line }]} />
          <View style={styles.row}>
            <Text style={[styles.title, { color: pal.sheetText }]}>Ajustes</Text>
            <Pressy onPress={onClose} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Cerrar ajustes" style={[styles.close, { borderColor: pal.line }]}>
              <Icon d={icons.close} size={18} color={pal.sheetText} strokeWidth={2.4} />
            </Pressy>
          </View>

          <Text style={[styles.section, { color: pal.sheetMuted }]}>Tema</Text>
          <View style={styles.themes}>
            {(Object.keys(palettes) as ThemeId[]).map((id) => {
              const p = palettes[id];
              const on = id === theme;
              return (
                <Pressy
                  key={id}
                  onPress={() => {
                    if (!on) haptic.select();
                    setTheme(id);
                  }}
                  scaleTo={0.96}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Tema ${p.label}`}
                  style={[styles.themeCard, { backgroundColor: pal.field, borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]}
                >
                  <LinearGradient colors={p.sky} style={styles.swatch}>
                    <View style={[styles.swatchSun, { backgroundColor: p.sun, opacity: p.sunOpacity }]} />
                    <View style={[styles.swatchHill, { backgroundColor: p.hill }]} />
                  </LinearGradient>
                  <Text style={[styles.themeLabel, { color: pal.sheetText }]}>{p.label}</Text>
                </Pressy>
              );
            })}
          </View>

          <View style={[styles.group, { backgroundColor: pal.field, borderColor: pal.line }]}>
            <View style={styles.groupRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: pal.sheetText }]}>Flores de cerezo</Text>
                <Text style={[styles.rowSub, { color: pal.sheetMuted }]}>Ramas y pétalos cayendo en el fondo</Text>
              </View>
              <Switch value={flowers} onValueChange={setFlowers} trackColor={{ true: pal.accent }} accessibilityLabel="Flores de cerezo" />
            </View>
          </View>

          <Text style={[styles.section, { color: pal.sheetMuted }]}>Pareja</Text>
          <View style={[styles.group, { backgroundColor: pal.field, borderColor: pal.line }]}>
            <View style={styles.groupRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: pal.sheetText }]}>{partner ? `Conectado con ${partner.name}` : 'Esperando a tu pareja'}</Text>
                <Text style={[styles.rowSub, { color: pal.sheetMuted }]}>Código para unirse</Text>
              </View>
              <Text selectable style={[styles.code, { color: pal.accent }]}>
                {coupleCode ?? '—'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: pal.line }]} />
            <View style={styles.groupRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: pal.sheetText }]}>Eres {me?.character === 'osito' ? 'el osito' : 'el pollito'}</Text>
                <Text style={[styles.rowSub, { color: pal.sheetMuted }]}>{partner ? `Intercambia los personajes con ${partner.name}` : 'Cambia de personaje'}</Text>
              </View>
              <Pressy onPress={swap} scaleTo={0.95} accessibilityRole="button" style={[styles.swap, { borderColor: pal.accent }]}>
                <Text style={[styles.swapText, { color: pal.accent }]}>Cambiar</Text>
              </Pressy>
            </View>
          </View>

          <Pressy onPress={() => supabase.auth.signOut()} scaleTo={0.97} style={styles.signOut} accessibilityRole="button">
            <Text style={[styles.signOutText, { color: pal.danger }]}>Cerrar sesión</Text>
          </Pressy>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,14,34,0.35)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, paddingHorizontal: 20, gap: 12 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontFamily: font.display, letterSpacing: -0.3 },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 14, fontFamily: font.bold, marginTop: 6 },
  themes: { flexDirection: 'row', gap: 10 },
  themeCard: { flex: 1, alignItems: 'center', gap: 8, padding: 6, paddingBottom: 10, borderRadius: 16 },
  swatch: { width: '100%', height: 80, borderRadius: 11, overflow: 'hidden', justifyContent: 'flex-end' },
  swatchSun: { position: 'absolute', top: 14, right: 14, width: 18, height: 18, borderRadius: 9 },
  swatchHill: { height: 20 },
  themeLabel: { fontSize: 14, fontFamily: font.heavy },
  group: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  rowTitle: { fontSize: 16, fontFamily: font.bold },
  rowSub: { fontSize: 13, fontFamily: font.body },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  swap: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center' },
  swapText: { fontSize: 14, fontFamily: font.heavy },
  code: { fontSize: 20, fontFamily: font.heavy, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  signOut: { alignSelf: 'center', paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  signOutText: { fontFamily: font.heavy, fontSize: 15 },
});
