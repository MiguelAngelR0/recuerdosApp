import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen, PairScreen } from '@/components/Onboarding';
import { SessionProvider, useSession } from '@/lib/session';
import { SettingsProvider, useSettings } from '@/lib/settings';

function Gate() {
  const { loading, session, me } = useSession();
  const { theme, pal } = useSettings();

  let content;
  if (loading) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: pal.sky[0] }}>
        <ActivityIndicator color={pal.accent} />
      </View>
    );
  } else if (!session) {
    content = <AuthScreen />;
  } else if (!me?.couple_id) {
    content = <PairScreen />;
  } else {
    content = <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
  }

  return (
    <>
      <StatusBar style={theme === 'noche' ? 'light' : 'dark'} />
      {content}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
