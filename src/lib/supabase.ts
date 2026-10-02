import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = url.startsWith('https://') && anonKey.length > 20;

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type StatusId = 'ejercicio' | 'estudiando' | 'durmiendo' | 'trabajando' | 'comiendo' | 'extrano';
export type CharacterKind = 'pollito' | 'osito';

export type Profile = {
  id: string;
  name: string;
  couple_id: string | null;
  character: CharacterKind;
  status: StatusId;
  status_at: string | null;
};

export type Memory = {
  id: string;
  couple_id: string;
  author_id: string;
  text: string;
  image_path: string | null;
  created_at: string;
};

export type Todo = {
  id: string;
  couple_id: string;
  author_id: string;
  text: string;
  done: boolean;
  assigned_to: string | null;
  created_at: string;
};
