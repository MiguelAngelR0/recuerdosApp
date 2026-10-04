import * as Haptics from 'expo-haptics';
import { Easing, ReduceMotion } from 'react-native-reanimated';

// Curvas fuertes: las de serie se quedan cortas.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

export const press = { duration: 120, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
export const release = { duration: 180, easing: EASE_OUT, reduceMotion: ReduceMotion.System };

// Una vibración por acción, nunca como único aviso.
export const haptic = {
  select: () => Haptics.selectionAsync().catch(() => {}),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
