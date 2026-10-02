import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { Background } from './Background';
import { Character } from './Characters';
import { Glass } from './Glass';

function Field(props: React.ComponentProps<typeof TextInput>) {
  const { pal } = useSettings();
  return (
    <Glass strong style={styles.field}>
      <TextInput placeholderTextColor={pal.muted} style={[styles.input, { color: pal.text }]} {...props} />
    </Glass>
  );
}

function PrimaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const { pal } = useSettings();
  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.primary, { backgroundColor: pal.accent }]} accessibilityRole="button">
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { pal } = useSettings();
  return (
    <View style={{ flex: 1 }}>
      <Background />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <View style={styles.characters}>
          <Character kind="pollito" status="extrano" size={110} />
          <Character kind="osito" status="extrano" size={110} />
        </View>
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
    if (res.error) setError(res.error.message);
    else if (mode === 'signup' && !res.data.session) setError('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
    setBusy(false);
  };

  return (
    <Shell title="Recuerdos" subtitle={mode === 'login' ? 'Entra en vuestro rincón' : 'Crea tu cuenta'}>
      {mode === 'signup' && <Field placeholder="Tu nombre" value={name} onChangeText={setName} />}
      <Field placeholder="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label={mode === 'login' ? 'Entrar' : 'Crear cuenta'} onPress={submit} busy={busy} />
      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.link}>
        <Text style={[styles.linkText, { color: pal.text }]}>{mode === 'login' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}</Text>
      </Pressable>
    </Shell>
  );
}

export function PairScreen() {
  const { refresh } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc('create_couple');
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
    <Shell title="Conecta con tu pareja" subtitle="Uno crea el rincón y comparte el código. El otro lo escribe aquí.">
      <PrimaryButton label="Crear nuestro rincón" onPress={create} busy={busy} />
      <Field placeholder="Código de tu pareja" value={code} onChangeText={setCode} autoCapitalize="characters" />
      <PrimaryButton label="Unirme con el código" onPress={join} busy={busy} />
      {error && <Text style={styles.error}>{error}</Text>}
    </Shell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 8 },
  characters: { flexDirection: 'row', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  form: { gap: 12 },
  field: { borderRadius: 24, height: 50, justifyContent: 'center' },
  input: { paddingHorizontal: 18, fontSize: 16, height: 50 },
  primary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  error: { color: '#B3261E', fontWeight: '700', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, padding: 8 },
  link: { alignItems: 'center', padding: 8 },
  linkText: { fontWeight: '800' },
});
