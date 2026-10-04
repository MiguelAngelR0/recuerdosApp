import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { CharacterKind, supabase, supabaseConfigured } from '@/lib/supabase';
import { Background } from './Background';
import { Character } from './Characters';
import { font } from '@/lib/theme';
import { haptic } from '@/lib/motion';
import { Glass } from './Glass';
import { Pressy } from './Pressy';

function Field(props: React.ComponentProps<typeof TextInput>) {
  const { pal } = useSettings();
  return (
    <Glass strong style={styles.field}>
      <TextInput placeholderTextColor={pal.muted} selectionColor={pal.accent} style={[styles.input, { color: pal.text }]} {...props} />
    </Glass>
  );
}

function PrimaryButton({ label, onPress, busy, quiet }: { label: string; onPress: () => void; busy?: boolean; quiet?: boolean }) {
  const { pal } = useSettings();
  return (
    <Pressy
      onPress={onPress}
      disabled={busy}
      scaleTo={0.97}
      style={[styles.primary, quiet ? { borderWidth: 1.5, borderColor: pal.accent } : { backgroundColor: pal.accent }]}
      accessibilityRole="button"
      accessibilityState={{ busy }}
    >
      {busy ? <ActivityIndicator color={quiet ? pal.accent : '#FFFFFF'} /> : <Text style={[styles.primaryText, quiet && { color: pal.accent }]}>{label}</Text>}
    </Pressy>
  );
}

function Shell({ title, subtitle, children, hideCharacters }: { title: string; subtitle: string; children: React.ReactNode; hideCharacters?: boolean }) {
  const { pal } = useSettings();
  return (
    <View style={{ flex: 1 }}>
      <Background />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        {!hideCharacters && (
          <View style={styles.characters}>
            <Character kind="pollito" status="extrano" size={110} />
            <Character kind="osito" status="extrano" size={110} />
          </View>
        )}
        <Text style={[styles.title, { color: pal.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: pal.muted }]}>{subtitle}</Text>
        <View style={styles.form}>{children}</View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function NotConfigured() {
  return (
    <Shell title="Falta conectar Supabase" subtitle="Crea el archivo .env con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY (mira el README).">
      <View />
    </Shell>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pal } = useSettings();

  if (!supabaseConfigured) return <NotConfigured />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() || 'Yo' } } });
    if (res.error) {
      haptic.error();
      setError(res.error.message.includes('Invalid login') ? 'Correo o contraseña incorrectos.' : res.error.message);
    }
    else if (mode === 'signup' && !res.data.session) setError('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
    setBusy(false);
  };

  return (
    <Shell title="Recuerdos" subtitle={mode === 'login' ? 'Entra en vuestro rincón' : 'Crea tu cuenta'}>
      {mode === 'signup' && <Field placeholder="Tu nombre" value={name} onChangeText={setName} />}
      <Field placeholder="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <Field placeholder="Contraseña" value={password} onChangeText={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} secureTextEntry />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} busy={busy} />
      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.link} accessibilityRole="button">
        <Text style={[styles.linkText, { color: pal.text }]}>{mode === 'login' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}</Text>
      </Pressable>
    </Shell>
  );
}

export function PairScreen() {
  const { refresh } = useSession();
  const { pal } = useSettings();
  const [code, setCode] = useState('');
  const [chosen, setChosen] = useState<CharacterKind>('pollito');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc('create_couple', { chosen });
    if (e) setError(e.message);
    await refresh();
    setBusy(false);
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc('join_couple', { join_code: code.trim().toUpperCase() });
    if (e) setError(e.message.includes('no_couple') ? 'Ese código no existe o ya está completo.' : e.message);
    await refresh();
    setBusy(false);
  };

  return (
    <Shell hideCharacters title="Conecta con tu pareja" subtitle="Uno elige su personaje y crea el rincón. El otro escribe el código y será el que quede libre.">
      <Text style={[styles.pickTitle, { color: pal.text }]}>¿Qué quieres ser?</Text>
      <View style={styles.pickRow}>
        {(['pollito', 'osito'] as CharacterKind[]).map((k) => {
          const on = k === chosen;
          return (
            <Pressy
              key={k}
              onPress={() => {
                if (!on) haptic.select();
                setChosen(k);
              }}
              scaleTo={0.96}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={k === 'pollito' ? 'Pollito' : 'Osito'}
              style={{ flex: 1 }}
            >
              <Glass strong={on} style={[styles.pick, { borderColor: on ? pal.accent : pal.glassBorder, borderWidth: on ? 2.5 : 1 }]}>
                <Character kind={k} status={on ? 'extrano' : 'durmiendo'} size={96} />
                <Text style={[styles.pickLabel, { color: on ? pal.accent : pal.text }]}>{k === 'pollito' ? 'Pollito' : 'Osito'}</Text>
              </Glass>
            </Pressy>
          );
        })}
      </View>
      <PrimaryButton label={`Crear nuestro rincón como ${chosen === 'pollito' ? 'pollito' : 'osito'}`} onPress={create} busy={busy} />
      <Text style={[styles.or, { color: pal.muted }]}>o</Text>
      <Field placeholder="Código de tu pareja" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} />
      <PrimaryButton label="Unirme con el código" onPress={join} busy={busy} quiet />
      {error && <Text style={styles.error}>{error}</Text>}
    </Shell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 6 },
  characters: { flexDirection: 'row', justifyContent: 'center' },
  title: { fontSize: 36, fontFamily: font.display, letterSpacing: -0.6, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 22, fontFamily: font.body, textAlign: 'center', marginBottom: 16 },
  form: { gap: 12 },
  field: { borderRadius: 16, height: 52, justifyContent: 'center' },
  input: { paddingHorizontal: 18, fontSize: 16, height: 52, fontFamily: font.body },
  primary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontFamily: font.heavy, fontSize: 16 },
  pickTitle: { fontSize: 18, fontFamily: font.display, textAlign: 'center' },
  pickRow: { flexDirection: 'row', gap: 12 },
  pick: { borderRadius: 16, alignItems: 'center', paddingTop: 4, paddingBottom: 10, overflow: 'hidden' },
  pickLabel: { fontSize: 15, fontFamily: font.heavy },
  or: { textAlign: 'center', fontFamily: font.bold, fontSize: 14 },
  error: { color: '#B3261E', fontFamily: font.bold, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 10, overflow: 'hidden' },
  link: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  linkText: { fontFamily: font.heavy, fontSize: 15 },
});
