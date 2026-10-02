import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Palette, palettes, ThemeId } from './theme';

type Settings = {
  theme: ThemeId;
  flowers: boolean;
  pal: Palette;
  setTheme: (t: ThemeId) => void;
  setFlowers: (on: boolean) => void;
};

const KEY = 'recuerdos.settings';
const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('floral');
  const [flowers, setFlowersState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as { theme?: ThemeId; flowers?: boolean };
      if (saved.theme && palettes[saved.theme]) setThemeState(saved.theme);
      if (typeof saved.flowers === 'boolean') setFlowersState(saved.flowers);
    });
  }, []);

  const persist = (next: { theme: ThemeId; flowers: boolean }) => AsyncStorage.setItem(KEY, JSON.stringify(next));

  const value: Settings = {
    theme,
    flowers,
    pal: palettes[theme],
    setTheme: (t) => {
      setThemeState(t);
      persist({ theme: t, flowers });
    },
    setFlowers: (on) => {
      setFlowersState(on);
      persist({ theme, flowers: on });
    },
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
