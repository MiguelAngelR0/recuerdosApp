import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen, PairScreen } from '@/components/Onboarding';
import { SessionProvider, useSession } from '@/lib/session';
import { SettingsProvider, useSettings } from '@/lib/settings';

function Gate() {
  const { loading, session, me } = useSession();
  const { theme, pal } = useSettings();
  const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });

  let content;
  if (loading || (!fontsLoaded && !fontError)) {
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
    // Fondo del tema en cada pantalla (sin él se ve un fogonazo blanco al cambiar)
    // y deslizamiento lateral nativo, igual en iOS y Android.
    content = (
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: pal.sky[0] },
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pal.sky[0] }}>
      <StatusBar style={theme === 'noche' ? 'light' : 'dark'} />
      {content}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SessionProvider>
            <Gate />
          </SessionProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
