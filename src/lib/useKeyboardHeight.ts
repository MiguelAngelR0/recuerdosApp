import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Altura del teclado en Android, para hojas dentro de un Modal (allí el sistema no empuja el contenido).
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
