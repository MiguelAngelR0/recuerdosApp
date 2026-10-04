import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from '@/components/Glass';
import { Pressy } from '@/components/Pressy';
import { EASE_OUT, haptic } from './motion';
import { clearBadge, registerPush } from './notify';
import { useSession } from './session';
import { useSettings } from './settings';
import { supabase, Timer } from './supabase';
import { font } from './theme';

type Route = '/recuerdos' | '/tareas' | '/temporizador';
type Notice = { id: number; text: string; route: Route };
type Unseen = { memories: boolean; todos: boolean };

const Ctx = createContext<{ unseen: Unseen; setUnseen: (u: Partial<Unseen>) => void } | null>(null);

// Escucha lo que hace tu pareja y lo cuenta con un aviso arriba y un punto en los botones.
export function NoticesProvider({ children }: { children: ReactNode }) {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [unseen, setUnseenState] = useState<Unseen>({ memories: false, todos: false });
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerName = partner?.name ?? 'Tu pareja';

  const setUnseen = useCallback((u: Partial<Unseen>) => setUnseenState((prev) => ({ ...prev, ...u })), []);

  const show = useCallback((text: string, route: Route) => {
    haptic.light();
    setNotice({ id: Date.now(), text, route });
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  useEffect(() => {
    if (me?.id) registerPush(me.id);
    clearBadge();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && clearBadge());
    // Tocar una notificación lleva a su pantalla.
    const tap = Notifications.addNotificationResponseReceivedListener((r) => {
      const route = r.notification.request.content.data?.route;
      if (route === '/recuerdos' || route === '/tareas' || route === '/temporizador') router.push(route);
    });
    return () => {
      sub.remove();
      tap.remove();
    };
  }, [me?.id]);

  useEffect(() => {
    if (!me?.couple_id) return;
    const filter = `couple_id=eq.${me.couple_id}`;
    const channel = supabase
      .channel(`notices-${me.couple_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memories', filter }, ({ new: m }) => {
        if ((m as { author_id: string }).author_id === me.id) return;
        setUnseen({ memories: true });
        show(`${partnerName} ha plantado un recuerdo nuevo`, '/recuerdos');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'todos', filter }, ({ new: t }) => {
        const todo = t as { author_id: string; text: string };
        if (todo.author_id === me.id) return;
        setUnseen({ todos: true });
        show(`${partnerName} ha añadido una tarea: ${todo.text}`, '/tareas');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timers', filter }, ({ new: t }) => {
        const timer = t as Timer;
        if (!timer?.updated_by || timer.updated_by === me.id) return;
        const what = timer.started_at ? 'ha puesto en marcha' : timer.paused_elapsed > 0 ? 'ha pausado' : 'ha reiniciado';
        show(`${partnerName} ${what} el temporizador`, '/temporizador');
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.couple_id, me?.id, partnerName, setUnseen, show]);

  return (
    <Ctx.Provider value={{ unseen, setUnseen }}>
      {children}
      {notice && (
        <Animated.View
          key={notice.id}
          entering={SlideInUp.duration(320).easing(EASE_OUT)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.wrap, { top: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <Pressy
            onPress={() => {
              setNotice(null);
              router.push(notice.route);
            }}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLiveRegion="polite"
          >
            <Glass strong style={styles.toast}>
              <View style={[styles.dot, { backgroundColor: pal.accent }]} />
              <Text style={[styles.text, { color: pal.text }]} numberOfLines={2}>
                {notice.text}
              </Text>
            </Glass>
          </Pressy>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useNotices() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotices must be used inside NoticesProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: font.bold },
});
