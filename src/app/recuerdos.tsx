import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Background } from '@/components/Background';
import { Glass } from '@/components/Glass';
import { Icon, icons } from '@/components/Icon';
import { MemorySheet } from '@/components/MemorySheet';
import { Pressy } from '@/components/Pressy';
import { RoundButton } from '@/components/RoundButton';
import { VineBoard } from '@/components/VineBoard';
import { addMemory, deleteMemory, loadMemories, MemoryItem, reorderMemories, updateMemory } from '@/lib/memories';
import { haptic } from '@/lib/motion';
import { useNotices } from '@/lib/notices';
import { sendPush } from '@/lib/notify';
import { markSeen } from '@/lib/seen';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { font } from '@/lib/theme';

export default function Recuerdos() {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const { setUnseen } = useNotices();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  // null = cerrada, 'new' = nuevo recuerdo, o el recuerdo que se edita.
  const [sheet, setSheet] = useState<MemoryItem | 'new' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [partnerSorting, setPartnerSorting] = useState(false);
  const live = useRef<RealtimeChannel | null>(null);
  const reload = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerName = partner?.name ?? 'Tu pareja';

  const load = useCallback(() => {
    loadMemories().then(setItems).catch(() => setItems([]));
  }, []);

  // Al reordenar llegan varios cambios seguidos: se recarga una sola vez.
  const loadSoon = useCallback(() => {
    if (reload.current) clearTimeout(reload.current);
    reload.current = setTimeout(load, 350);
  }, [load]);

  const seen = useCallback(() => {
    markSeen('memories');
    setUnseen({ memories: false });
  }, [setUnseen]);

  useEffect(() => {
    load();
    seen();
    if (!me?.couple_id) return;
    const changes = supabase
      .channel(`memories-${me.couple_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter: `couple_id=eq.${me.couple_id}` }, () => {
        loadSoon();
        seen();
      })
      .subscribe();
    // Canal en directo: tu pareja ve cómo mueves las tarjetas mientras las mueves.
    const vine = supabase
      .channel(`vine-${me.couple_id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'sorting' }, ({ payload }) => setPartnerSorting(!!payload?.active))
      .on('broadcast', { event: 'order' }, ({ payload }) => {
        const ids = payload?.ids as string[] | undefined;
        if (!ids) return;
        setItems((prev) => (prev ? ids.map((id) => prev.find((m) => m.id === id)).filter((m): m is MemoryItem => !!m) : prev));
      })
      .subscribe();
    live.current = vine;
    return () => {
      supabase.removeChannel(changes);
      supabase.removeChannel(vine);
      live.current = null;
    };
  }, [load, loadSoon, seen, me?.couple_id]);

  if (!me) return null;
  const nameOf = (id: string) => (id === me.id ? 'Tú' : partnerName);
  const list = items ?? [];

  const broadcast = (event: 'sorting' | 'order', payload: object) => {
    live.current?.send({ type: 'broadcast', event, payload });
  };

  const reorder = (ids: string[]) => {
    setItems((prev) => (prev ? ids.map((id) => prev.find((m) => m.id === id)).filter((m): m is MemoryItem => !!m) : prev));
    broadcast('order', { ids });
    reorderMemories(ids).catch(() => load());
  };

  const move = (m: MemoryItem, dir: -1 | 1) => {
    const ids = list.map((x) => x.id);
    const i = ids.indexOf(m.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    haptic.select();
    reorder(ids);
  };

  const editing = sheet && sheet !== 'new' ? (list.find((m) => m.id === sheet.id) ?? sheet) : null;
  const editingIndex = editing ? list.findIndex((m) => m.id === editing.id) : -1;

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={[styles.title, { color: pal.text }]}>Nuestra enredadera</Text>
        {partnerSorting ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)}>
            <Glass style={styles.live}>
              <View style={[styles.liveDot, { backgroundColor: pal.accent }]} />
              <Text style={[styles.liveText, { color: pal.text }]}>{partnerName} está ordenando la enredadera…</Text>
            </Glass>
          </Animated.View>
        ) : (
          <Text style={[styles.subtitle, { color: pal.muted }]}>
            {list.length > 1
              ? 'Toca un recuerdo para editarlo. Mantén pulsado y arrástralo para cambiarlo de sitio.'
              : list.length === 1
                ? 'Toca el recuerdo para editarlo.'
                : `Tú y ${partnerName}`}
          </Text>
        )}
      </View>

      {items === null ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Glass strong style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: pal.text }]}>Aún no hay recuerdos. Planta el primero con una foto.</Text>
          </Glass>
        </View>
      ) : (
        <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          <VineBoard
            items={list}
            authorName={nameOf}
            onOpen={(m) => {
              haptic.light();
              setSheet(m);
            }}
            onLiveOrder={(ids) => broadcast('order', { ids })}
            onReorder={reorder}
            onDragChange={(on) => {
              setDragging(on);
              broadcast('sorting', { active: on });
            }}
          />
        </ScrollView>
      )}

      <View style={[styles.bottom, { bottom: insets.bottom + 20 }]}>
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
      </View>

      <MemorySheet
        visible={sheet !== null}
        memory={editing}
        canMoveUp={editingIndex > 0}
        canMoveDown={editingIndex >= 0 && editingIndex < list.length - 1}
        onMove={(dir) => editing && move(editing, dir)}
        onClose={() => setSheet(null)}
        onSave={async (fields) => {
          if (editing) await updateMemory(editing, fields);
          else {
            await addMemory(me.couple_id!, me.id, fields);
            sendPush(partner?.push_token, 'Nuevo recuerdo', `${me.name} ha plantado un recuerdo${fields.text ? `: ${fields.text}` : ''}`, { route: '/recuerdos' });
          }
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
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  title: { fontSize: 34, fontFamily: font.display, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 20, fontFamily: font.body },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 14, fontFamily: font.bold },
  empty: { paddingHorizontal: 20, paddingTop: 24 },
  emptyCard: { borderRadius: 16, padding: 16 },
  emptyText: { fontSize: 16, lineHeight: 22, fontFamily: font.bold },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { height: 52, paddingHorizontal: 24, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 16 },
});
