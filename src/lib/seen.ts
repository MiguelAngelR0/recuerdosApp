import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

type Kind = 'memories' | 'todos';
const key = (kind: Kind) => `recuerdos.lastSeen.${kind}`;

export async function markSeen(kind: Kind) {
  await AsyncStorage.setItem(key(kind), new Date().toISOString());
}

// ¿Tu pareja ha creado algo desde la última vez que abriste esa pantalla?
export async function hasNew(kind: Kind, myId: string) {
  const seen = (await AsyncStorage.getItem(key(kind))) ?? (await AsyncStorage.getItem('recuerdos.lastSeenMemory')) ?? '1970-01-01T00:00:00Z';
  const { count } = await supabase
    .from(kind)
    .select('id', { count: 'exact', head: true })
    .neq('author_id', myId)
    .gt('created_at', seen);
  return (count ?? 0) > 0;
}
