import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Background } from '@/components/Background';
import { Character } from '@/components/Characters';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { Pressy } from '@/components/Pressy';
import { RoundButton } from '@/components/RoundButton';
import { SettingsSheet } from '@/components/SettingsSheet';
import { StatusWheel } from '@/components/StatusWheel';
import { hasNewMemory } from '@/lib/memories';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import type { Profile } from '@/lib/supabase';
import { haptic } from '@/lib/motion';
import { font, statusById } from '@/lib/theme';

function StatusChip({ profile }: { profile: Profile }) {
  const { pal } = useSettings();
  const s = statusById[profile.status] ?? statusById.durmiendo;
  return (
    <Glass style={styles.chip}>
      <Animated.View key={profile.status} entering={FadeIn.duration(220)} style={styles.chipInner}>
        <Icon d={s.icon} size={15} color={pal.icon} strokeWidth={2.4} />
        <Text style={[styles.chipName, { color: pal.text }]}>{profile.name}</Text>
        <Text style={[styles.chipText, { color: pal.muted }]}>{s.label}</Text>
      </Animated.View>
    </Glass>
  );
}

export default function Home() {
  const { me, partner, setMyStatus } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const [wheel, setWheel] = useState(false);
  const [settings, setSettings] = useState(false);
  const [newMemory, setNewMemory] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (me) hasNewMemory(me.id).then(setNewMemory).catch(() => {});
    }, [me]),
  );

  if (!me) return null;

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <View style={[styles.top, { top: insets.top + 90 }]}>
        <RoundButton icon={icons.leaf} label="Recuerdos" badge={newMemory} onPress={() => router.push('/recuerdos')} />
        <RoundButton icon={icons.sliders} size={48} onPress={() => setSettings(true)} label="Ajustes" />
        <RoundButton icon={icons.check} label="Tareas" onPress={() => router.push('/tareas')} />
      </View>

      <View style={styles.stage}>
        <View style={styles.chips}>
          <StatusChip profile={me} />
          {partner && <StatusChip profile={partner} />}
        </View>
        <View style={styles.characters}>
          <Pressy
            onPress={() => {
              haptic.light();
              setWheel(true);
            }}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={`Tu estado: ${statusById[me.status]?.label ?? ''}. Toca para cambiarlo`}
          >
            <Character kind={me.character} status={me.status} />
          </Pressy>
          {partner ? (
            <Character kind={partner.character} status={partner.status} />
          ) : (
            <Glass style={styles.waiting}>
              <Text style={[styles.waitingText, { color: pal.text }]}>Tu pareja aún no se ha unido. Pásale el código que verás en Ajustes.</Text>
            </Glass>
          )}
        </View>
        <Text style={[styles.hint, { color: pal.muted }]}>Toca a tu personaje para cambiar tu estado</Text>
      </View>

      <StatusWheel
        visible={wheel}
        current={me.status}
        onClose={() => setWheel(false)}
        onPick={(s) => {
          setWheel(false);
          setMyStatus(s);
        }}
      />
      <SettingsSheet visible={settings} onClose={() => setSettings(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stage: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '22%', gap: 8 },
  chips: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 12 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipName: { fontSize: 13, fontFamily: font.heavy },
  chipText: { fontSize: 13, fontFamily: font.body },
  characters: { flexDirection: 'row', alignItems: 'flex-end' },
  waiting: { width: 176, padding: 16, borderRadius: 16, marginBottom: 30 },
  waitingText: { fontSize: 14, lineHeight: 19, fontFamily: font.bold, textAlign: 'center' },
  hint: { fontSize: 14, fontFamily: font.body },
});
