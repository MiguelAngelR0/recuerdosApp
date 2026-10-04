import { useCallback, useEffect, useState } from 'react';
import { Phase, supabase, Timer } from './supabase';

export const DEFAULT_PHASES: Phase[] = [
  { label: 'Estudiar', seconds: 25 * 60 },
  { label: 'Descansar', seconds: 5 * 60 },
];

export const PRESETS: { name: string; phases: Phase[]; rounds: number }[] = [
  { name: 'Estudio', phases: DEFAULT_PHASES, rounds: 4 },
  { name: 'Tabata', phases: [{ label: 'Ejercicio', seconds: 20 }, { label: 'Descanso', seconds: 10 }], rounds: 8 },
  { name: 'Estudio largo', phases: [{ label: 'Estudiar', seconds: 50 * 60 }, { label: 'Descansar', seconds: 10 * 60 }], rounds: 3 },
];

export const PHASE_COLORS = ['#E5608A', '#5E9A62', '#6E8FD6', '#E8A33D', '#9C6ADE', '#3FA7A0'];

export function totalSeconds(t: Pick<Timer, 'phases' | 'rounds'>) {
  return t.phases.reduce((s, p) => s + p.seconds, 0) * t.rounds;
}

export function elapsedAt(t: Timer, now = Date.now()) {
  const run = t.started_at ? (now - new Date(t.started_at).getTime()) / 1000 : 0;
  return Math.min(Math.max(t.paused_elapsed + run, 0), totalSeconds(t));
}

// Dónde estamos: ronda, fase y lo que le queda a esa fase.
export function positionAt(t: Timer, elapsed: number) {
  const cycle = t.phases.reduce((s, p) => s + p.seconds, 0) || 1;
  const done = elapsed >= totalSeconds(t);
  const round = Math.min(Math.floor(elapsed / cycle), t.rounds - 1);
  let inCycle = elapsed - round * cycle;
  let phase = 0;
  while (phase < t.phases.length - 1 && inCycle >= t.phases[phase].seconds) {
    inCycle -= t.phases[phase].seconds;
    phase++;
  }
  const remaining = done ? 0 : Math.max(t.phases[phase].seconds - inCycle, 0);
  const next = done ? null : phase < t.phases.length - 1 ? t.phases[phase + 1] : round < t.rounds - 1 ? t.phases[0] : null;
  return { round, phase, remaining, next, done };
}

// Momentos (en segundos desde el inicio) en que empieza cada fase, para avisar.
export function boundaries(t: Timer) {
  const out: { at: number; label: string; last: boolean }[] = [];
  let at = 0;
  for (let r = 0; r < t.rounds; r++) {
    t.phases.forEach((p, i) => {
      at += p.seconds;
      const last = r === t.rounds - 1 && i === t.phases.length - 1;
      out.push({ at, label: last ? '' : t.phases[(i + 1) % t.phases.length].label, last });
    });
  }
  return out;
}

export function clock(seconds: number) {
  const s = Math.ceil(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function blank(coupleId: string): Timer {
  return { couple_id: coupleId, phases: DEFAULT_PHASES, rounds: 4, started_at: null, paused_elapsed: 0, updated_by: null, updated_at: new Date().toISOString() };
}

// El temporizador de la pareja, sincronizado en tiempo real entre los dos móviles.
export function useSharedTimer(coupleId: string | null | undefined, myId: string | undefined) {
  const [timer, setTimer] = useState<Timer | null>(null);

  const load = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase.from('timers').select('*').eq('couple_id', coupleId).maybeSingle<Timer>();
    setTimer(data ?? blank(coupleId));
  }, [coupleId]);

  useEffect(() => {
    load();
    if (!coupleId) return;
    const channel = supabase
      .channel(`timer-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timers', filter: `couple_id=eq.${coupleId}` }, ({ new: t }) => {
        if (t && 'couple_id' in t) setTimer(t as Timer);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, load]);

  const write = useCallback(
    async (patch: Partial<Timer>) => {
      if (!coupleId || !timer) return;
      const next: Timer = { ...timer, ...patch, couple_id: coupleId, updated_by: myId ?? null, updated_at: new Date().toISOString() };
      setTimer(next);
      const { error } = await supabase.from('timers').upsert(next);
      if (error) load();
    },
    [coupleId, myId, timer, load],
  );

  const start = () => {
    if (!timer) return;
    const done = elapsedAt(timer) >= totalSeconds(timer);
    return write({ started_at: new Date().toISOString(), paused_elapsed: done ? 0 : timer.paused_elapsed });
  };
  const pause = () => timer && write({ started_at: null, paused_elapsed: elapsedAt(timer) });
  const reset = () => write({ started_at: null, paused_elapsed: 0 });
  const save = (phases: Phase[], rounds: number) => write({ phases, rounds, started_at: null, paused_elapsed: 0 });

  return { timer, start, pause, reset, save };
}
