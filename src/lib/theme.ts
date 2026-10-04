// Una sola familia redondeada para la interfaz y Fredoka para los títulos.
export const font = {
  display: 'Fredoka_600SemiBold',
  body: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
};

export type ThemeId = 'floral' | 'dia' | 'noche';

export type Palette = {
  label: string;
  sky: [string, string, string];
  stars: number;
  sun: string;
  sunOpacity: number;
  mountain: string;
  snow: string;
  hill: string;
  branch: string;
  blossom: string;
  blossomCenter: string;
  glass: string;
  glassBorder: string;
  card: string;
  text: string;
  muted: string;
  icon: string;
  accent: string;
  blurTint: 'light' | 'dark';
  vine: string;
  leaf: string;
  pot: string;
  sheet: string;
  sheetText: string;
  sheetMuted: string;
  line: string;
  field: string;
  danger: string;
};

export const palettes: Record<ThemeId, Palette> = {
  floral: {
    label: 'Floral',
    sky: ['#FCE4EC', '#F8D5E0', '#FBEAF0'],
    stars: 0,
    sun: '#FFFFFF',
    sunOpacity: 0.55,
    mountain: '#EDC0D0',
    snow: '#FFFFFF',
    hill: '#F7DCE5',
    branch: '#5B3A3A',
    blossom: '#F9B4C8',
    blossomCenter: '#E5608A',
    glass: 'rgba(255,255,255,0.4)',
    glassBorder: 'rgba(255,255,255,0.8)',
    card: 'rgba(255,255,255,0.6)',
    text: '#5A2238',
    muted: '#6A4A5A',
    icon: '#9C2F55',
    accent: '#B0345E',
    blurTint: 'light',
    vine: '#3E7A4B',
    leaf: '#5E9A62',
    pot: '#C26A4A',
    sheet: '#FFF7F9',
    sheetText: '#4A1D30',
    sheetMuted: '#7A5566',
    line: 'rgba(90,34,56,0.12)',
    field: '#FFFFFF',
    danger: '#B3261E',
  },
  dia: {
    label: 'Día',
    sky: ['#BFE3FF', '#DDF0FF', '#F2FAEF'],
    stars: 0,
    sun: '#FFD54F',
    sunOpacity: 0.9,
    mountain: '#A9CBE0',
    snow: '#FFFFFF',
    hill: '#CDE8C4',
    branch: '#6B4A3A',
    blossom: '#FFD1DE',
    blossomCenter: '#F2789C',
    glass: 'rgba(255,255,255,0.42)',
    glassBorder: 'rgba(255,255,255,0.85)',
    card: 'rgba(255,255,255,0.62)',
    text: '#173A52',
    muted: '#3E5A6E',
    icon: '#1F5F8B',
    accent: '#1F5F8B',
    blurTint: 'light',
    vine: '#3E7A4B',
    leaf: '#5E9A62',
    pot: '#C26A4A',
    sheet: '#F7FBFF',
    sheetText: '#14324A',
    sheetMuted: '#4A6478',
    line: 'rgba(23,58,82,0.12)',
    field: '#FFFFFF',
    danger: '#B3261E',
  },
  noche: {
    label: 'Noche',
    sky: ['#171A3D', '#2E2A62', '#4A3F7C'],
    stars: 0.9,
    sun: '#FFF4D6',
    sunOpacity: 0.95,
    mountain: '#2A2858',
    snow: '#C9C6EA',
    hill: '#3B3670',
    branch: '#1A1530',
    blossom: '#E7A6C4',
    blossomCenter: '#B95A88',
    glass: 'rgba(255,255,255,0.14)',
    glassBorder: 'rgba(255,255,255,0.35)',
    card: 'rgba(255,255,255,0.14)',
    text: '#FFFFFF',
    muted: '#CFC7E8',
    icon: '#F6D7E6',
    accent: '#6E5ABE',
    blurTint: 'dark',
    vine: '#7FA88A',
    leaf: '#6E9A7A',
    pot: '#7A4E5E',
    sheet: '#221E46',
    sheetText: '#F4F0FF',
    sheetMuted: '#BDB4DE',
    line: 'rgba(255,255,255,0.14)',
    field: '#2D2858',
    danger: '#FFB4AB',
  },
};

export type StatusDef = { id: import('./supabase').StatusId; label: string; icon: string };

export const statuses: StatusDef[] = [
  { id: 'ejercicio', label: 'Ejercicio', icon: 'M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12' },
  { id: 'estudiando', label: 'Estudiando', icon: 'M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7' },
  { id: 'durmiendo', label: 'Durmiendo', icon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z' },
  { id: 'trabajando', label: 'Trabajando', icon: 'M3 8h18v12H3zM9 8V5h6v3' },
  { id: 'comiendo', label: 'Comiendo', icon: 'M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 21V3c-2 2-3 5-3 8h3' },
  { id: 'extrano', label: 'Te extraño', icon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z' },
];

export const statusById = Object.fromEntries(statuses.map((s) => [s.id, s])) as Record<StatusDef['id'], StatusDef>;
