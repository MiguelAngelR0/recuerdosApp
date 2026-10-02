import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Profile, StatusId, supabase } from './supabase';

type SessionState = {
  loading: boolean;
  session: Session | null;
  me: Profile | null;
  partner: Profile | null;
  coupleCode: string | null;
  refresh: () => Promise<void>;
  setMyStatus: (s: StatusId) => Promise<void>;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [coupleCode, setCoupleCode] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setMe(null);
      setPartner(null);
      setCoupleCode(null);
      setLoading(false);
      return;
    }
    const { data: mine } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<Profile>();
    setMe(mine ?? null);
    if (mine?.couple_id) {
      const [{ data: other }, { data: couple }] = await Promise.all([
        supabase.from('profiles').select('*').eq('couple_id', mine.couple_id).neq('id', userId).maybeSingle<Profile>(),
        supabase.from('couples').select('code').eq('id', mine.couple_id).maybeSingle<{ code: string }>(),
      ]);
      setPartner(other ?? null);
      setCoupleCode(couple?.code ?? null);
    } else {
      setPartner(null);
      setCoupleCode(null);
    }
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Escucha en tiempo real los cambios de estado de la pareja.
  useEffect(() => {
    if (!me?.couple_id) return;
    const channel = supabase
      .channel(`profiles-${me.couple_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${me.couple_id}` }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.couple_id, refresh]);

  const setMyStatus = useCallback(
    async (status: StatusId) => {
      if (!me) return;
      setMe({ ...me, status });
      await supabase.from('profiles').update({ status, status_at: new Date().toISOString() }).eq('id', me.id);
    },
    [me],
  );

  return (
    <Ctx.Provider value={{ loading, session, me, partner, coupleCode, refresh, setMyStatus }}>{children}</Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
