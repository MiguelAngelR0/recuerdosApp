import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Con la app abierta ya enseñamos nuestro propio aviso: el banner nativo solo hace falta fuera de ella.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// Pide permiso, guarda el token push de este móvil en tu perfil y lo devuelve.
// En Expo Go para Android no hay push remoto: se ignora sin romper nada.
export async function registerPush(myId: string) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#B0345E',
      });
    }
    if (!Device.isDevice) return null;
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('profiles').update({ push_token: token }).eq('id', myId);
    return token;
  } catch {
    return null;
  }
}

// Manda una notificación al móvil de tu pareja a través del servicio push gratuito de Expo.
export async function sendPush(to: string | null | undefined, title: string, body: string, data: Record<string, string> = {}) {
  if (!to) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to, title, body, data, sound: 'default', channelId: 'default', badge: 1 }),
    });
  } catch {
    // Sin conexión: la pareja lo verá igualmente al abrir la app.
  }
}

// Avisos locales del temporizador (fin de cada fase), para este móvil.
export async function scheduleLocal(title: string, body: string, inSeconds: number) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(inSeconds)), channelId: 'default' },
    });
  } catch {
    return null;
  }
}

export async function cancelLocal(ids: string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

export function clearBadge() {
  Notifications.setBadgeCountAsync(0).catch(() => {});
}
