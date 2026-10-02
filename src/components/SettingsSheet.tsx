import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { palettes, ThemeId } from '@/lib/theme';
import { Icon, icons } from './Icon';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, setTheme, flowers, setFlowers } = useSettings();
  const { coupleCode, partner } = useSession();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar ajustes" />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <View style={styles.row}>
            <Text style={styles.title}>Ajustes</Text>
            <Pressable onPress={onClose} accessibilityLabel="Cerrar ajustes" style={styles.close}>
              <Icon d={icons.close} size={20} color="#2E1A28" strokeWidth={2.4} />
            </Pressable>
          </View>

          <Text style={styles.section}>TEMA</Text>
          <View style={styles.themes}>
            {(Object.keys(palettes) as ThemeId[]).map((id) => {
              const p = palettes[id];
              const on = id === theme;
              return (
                <Pressable
                  key={id}
                  onPress={() => setTheme(id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.themeCard, { borderColor: on ? '#2E1A28' : 'rgba(46,26,40,0.12)' }]}
                >
                  <LinearGradient colors={p.sky} style={styles.swatch}>
                    <View style={[styles.swatchHill, { backgroundColor: p.hill }]} />
                  </LinearGradient>
                  <Text style={styles.themeLabel}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.toggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Flores de cerezo</Text>
              <Text style={styles.toggleSub}>Ramas y pétalos cayendo en el fondo</Text>
            </View>
            <Switch value={flowers} onValueChange={setFlowers} trackColor={{ true: '#B0345E' }} accessibilityLabel="Flores de cerezo" />
          </View>

          <Text style={styles.section}>PAREJA</Text>
          <View style={styles.toggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>{partner ? `Conectado con ${partner.name}` : 'Esperando a tu pareja'}</Text>
              <Text style={styles.toggleSub}>Código para unirse: {coupleCode ?? '—'}</Text>
            </View>
          </View>

          <Pressable onPress={() => supabase.auth.signOut()} style={styles.signOut} accessibilityRole="button">
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(40,20,45,0.3)' },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: 20,
    gap: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#2E1A28' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(46,26,40,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { fontSize: 13, fontWeight: '800', color: '#6A4A5A', letterSpacing: 0.8 },
  themes: { flexDirection: 'row', gap: 12 },
  themeCard: { flex: 1, alignItems: 'center', gap: 8, padding: 8, paddingBottom: 12, borderRadius: 18, borderWidth: 2.5, backgroundColor: '#FFFFFF' },
  swatch: { width: '100%', height: 84, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end' },
  swatchHill: { height: 22 },
  themeLabel: { fontSize: 14, fontWeight: '800', color: '#2E1A28' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(46,26,40,0.12)',
  },
  toggleTitle: { fontSize: 15, fontWeight: '800', color: '#2E1A28' },
  toggleSub: { fontSize: 12, fontWeight: '600', color: '#6A4A5A' },
  signOut: { alignSelf: 'center', padding: 12 },
  signOutText: { color: '#B0345E', fontWeight: '800', fontSize: 15 },
});
