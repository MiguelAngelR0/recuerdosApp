import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Background } from '@/components/Background';
import { Icon, icons } from '@/components/Icon';
import { Pressy } from '@/components/Pressy';
import { RoundButton } from '@/components/RoundButton';
import { RoutineSheet } from '@/components/RoutineSheet';
import { haptic } from '@/lib/motion';
import { cancelLocal, scheduleLocal, sendPush } from '@/lib/notify';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import type { Timer } from '@/lib/supabase';
import { font } from '@/lib/theme';
import { boundaries, clock, elapsedAt, PHASE_COLORS, positionAt, totalSeconds, useSharedTimer } from '@/lib/timer';

const STROKE = 18;
const GAP_DEG = 1.2;

function polar(c: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
}

function arc(c: number, r: number, from: number, to: number) {
  if (to - from <= 0.01) return '';
  const s = polar(c, r, from);
  const e = polar(c, r, to);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

// Un solo círculo con toda la rutina: cada fase es un tramo de su color, y se va rellenando.
function Ring({ timer, elapsed, size, track }: { timer: Timer; elapsed: number; size: number; track: string }) {
  const c = size / 2;
  const r = c - STROKE / 2 - 4;
  const total = totalSeconds(timer) || 1;
  const segments: { from: number; to: number; color: string }[] = [];
  let t = 0;
  for (let round = 0; round < timer.rounds; round++) {
    timer.phases.forEach((p, i) => {
      segments.push({ from: (t / total) * 360, to: ((t + p.seconds) / total) * 360, color: PHASE_COLORS[i % PHASE_COLORS.length] });
      t += p.seconds;
    });
  }
  const now = (elapsed / total) * 360;
  const knob = polar(c, r, now);
  const gap = segments.length > 1 ? GAP_DEG : 0;

  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={r} stroke={track} strokeWidth={STROKE} fill="none" />
      {segments.map((s, i) => (
        <Path key={`bg${i}`} d={arc(c, r, s.from + gap / 2, s.to - gap / 2)} stroke={s.color} strokeOpacity={0.28} strokeWidth={STROKE} strokeLinecap="butt" fill="none" />
      ))}
      {segments.map((s, i) =>
        now > s.from ? (
          <Path key={`fg${i}`} d={arc(c, r, s.from + gap / 2, Math.min(now, s.to - gap / 2))} stroke={s.color} strokeWidth={STROKE} strokeLinecap="butt" fill="none" />
        ) : null,
      )}
      {elapsed > 0 && <Circle cx={knob.x} cy={knob.y} r={STROKE / 2 + 3} fill="#FFFFFF" stroke={track} strokeWidth={2} />}
    </Svg>
  );
}

export default function Temporizador() {
  const { me, partner } = useSession();
  const { pal } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { timer, start, pause, reset, save } = useSharedTimer(me?.couple_id, me?.id);
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState(false);
  const scheduled = useRef<string[]>([]);
  const lastPhase = useRef<string | null>(null);

  const running = !!timer?.started_at;

  // Mientras corre, refresca cuatro veces por segundo.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // Avisos en este móvil al acabar cada fase (también con la app en segundo plano).
  useEffect(() => {
    if (!timer) return;
    let cancelled = false;
    (async () => {
      await cancelLocal(scheduled.current);
      scheduled.current = [];
      if (!timer.started_at) return;
      const elapsed = elapsedAt(timer);
      const ids: string[] = [];
      for (const b of boundaries(timer)) {
        if (b.at <= elapsed) continue;
        if (ids.length >= 40) break;
        const id = await scheduleLocal(b.last ? 'Rutina terminada' : `Ahora: ${b.label}`, b.last ? '¡Buen trabajo los dos!' : 'Cambio de fase en el temporizador', b.at - elapsed);
        if (id) ids.push(id);
      }
      if (cancelled) cancelLocal(ids);
      else scheduled.current = ids;
    })();
    return () => {
      cancelled = true;
    };
  }, [timer]);

  // Vibra al cambiar de fase con la pantalla abierta.
  const live = timer ? positionAt(timer, elapsedAt(timer, now)) : null;
  const phaseKey = live ? `${live.round}-${live.phase}-${live.done}` : null;
  useEffect(() => {
    if (running && phaseKey && lastPhase.current && lastPhase.current !== phaseKey) haptic.medium();
    lastPhase.current = phaseKey;
  }, [phaseKey, running]);

  if (!me) return null;

  const size = Math.min(width - 64, 320);
  const elapsed = timer ? elapsedAt(timer, now) : 0;
  const pos = timer ? positionAt(timer, elapsed) : null;
  const phase = timer && pos ? timer.phases[pos.phase] : null;


  const toggle = async () => {
    if (!timer) return;
    haptic.medium();
    if (running && !pos?.done) {
      await pause();
      sendPush(partner?.push_token, 'Temporizador en pausa', `${me.name} ha pausado ${phase?.label ?? 'la rutina'}`, { route: '/temporizador' });
    } else {
      await start();
      sendPush(partner?.push_token, 'Temporizador en marcha', `${me.name} ha empezado la rutina`, { route: '/temporizador' });
    }
  };

  const restart = async () => {
    haptic.light();
    await reset();
    sendPush(partner?.push_token, 'Temporizador reiniciado', `${me.name} ha parado la rutina`, { route: '/temporizador' });
  };

  const lastEditor = timer?.updated_by ? (timer.updated_by === me.id ? 'Tú' : partner?.name ?? 'Tu pareja') : null;

  return (
    <View style={{ flex: 1 }}>
      <Background />
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: pal.text }]}>Temporizador</Text>
          <Text style={[styles.subtitle, { color: pal.muted }]}>
            {lastEditor ? `${lastEditor} ${running ? 'lo puso en marcha' : 'lo tocó por última vez'}` : 'Lo veis los dos a la vez'}
          </Text>
        </View>
        <RoundButton icon={icons.edit} label="Editar rutina" showLabel={false} size={48} onPress={() => setEditing(true)} />
      </View>

      {!timer || !pos || !phase ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.body}>
          <View style={{ width: size, height: size }}>
            <Ring timer={timer} elapsed={elapsed} size={size} track={pal.glass} />
            <View style={styles.center} pointerEvents="none">
              {pos.done ? (
                <>
                  <Text style={[styles.phase, { color: pal.accent }]}>Rutina completada</Text>
                  <Text style={[styles.time, { color: pal.text }]}>{clock(totalSeconds(timer))}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.phase, { color: PHASE_COLORS[pos.phase % PHASE_COLORS.length] }]}>{phase.label}</Text>
                  <Text style={[styles.time, { color: pal.text }]}>{clock(pos.remaining)}</Text>
                  <Text style={[styles.round, { color: pal.muted }]}>
                    Vuelta {pos.round + 1} de {timer.rounds}
                  </Text>
                  {pos.next && <Text style={[styles.next, { color: pal.muted }]}>Después: {pos.next.label}</Text>}
                </>
              )}
            </View>
          </View>

          <View style={styles.legend}>
            {timer.phases.map((p, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }]} />
                <Text style={[styles.legendText, { color: pal.text }]}>
                  {p.label} · {clock(p.seconds)}
                </Text>
              </View>
            ))}
            <Text style={[styles.legendText, { color: pal.muted }]}>× {timer.rounds} vueltas · {clock(totalSeconds(timer))} en total</Text>
          </View>
        </View>
      )}

      <View style={[styles.bottom, { bottom: insets.bottom + 20 }]}>
        <RoundButton icon={icons.home} label="Inicio" showLabel={false} size={52} onPress={() => router.back()} />
        <Pressy onPress={toggle} disabled={!timer} scaleTo={0.94} accessibilityRole="button" style={[styles.main, { backgroundColor: pal.accent }]}>
          <Icon d={running && !pos?.done ? icons.pause : icons.play} size={22} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={styles.mainText}>{running && !pos?.done ? 'Pausar' : elapsed > 0 && !pos?.done ? 'Seguir' : 'Empezar'}</Text>
        </Pressy>
        <RoundButton icon={icons.reset} label="Reiniciar" showLabel={false} size={52} onPress={restart} />
      </View>

      {timer && (
        <RoutineSheet
          visible={editing}
          phases={timer.phases}
          rounds={timer.rounds}
          onClose={() => setEditing(false)}
          onSave={(phases, rounds) => {
            setEditing(false);
            save(phases, rounds);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 34, fontFamily: font.display, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 20, fontFamily: font.body },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingBottom: 96 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 2 },
  phase: { fontSize: 20, fontFamily: font.display },
  time: { fontSize: 56, fontFamily: font.heavy, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  round: { fontSize: 15, fontFamily: font.bold },
  next: { fontSize: 13, fontFamily: font.body },
  legend: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 14, fontFamily: font.bold, fontVariant: ['tabular-nums'] },
  bottom: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  main: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mainText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 17 },
});
