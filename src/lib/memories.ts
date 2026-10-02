import AsyncStorage from '@react-native-async-storage/async-storage';
import { Memory, supabase } from './supabase';

const SEEN_KEY = 'recuerdos.lastSeenMemory';

export async function markMemoriesSeen() {
  await AsyncStorage.setItem(SEEN_KEY, new Date().toISOString());
}

// ¿Hay algún recuerdo de tu pareja más nuevo que la última vez que abriste Recuerdos?
export async function hasNewMemory(myId: string) {
  const seen = (await AsyncStorage.getItem(SEEN_KEY)) ?? '1970-01-01T00:00:00Z';
  const { count } = await supabase
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .neq('author_id', myId)
    .gt('created_at', seen);
  return (count ?? 0) > 0;
}

export async function loadMemories() {
  const { data, error } = await supabase.from('memories').select('*').order('created_at', { ascending: false }).returns<Memory[]>();
  if (error) throw error;
  const paths = data.map((m) => m.image_path).filter((p): p is string => !!p);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('memories').createSignedUrls(paths, 60 * 60);
    signed?.forEach((s) => {
      if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
    });
  }
  return data.map((m) => ({ ...m, url: m.image_path ? urls[m.image_path] : undefined }));
}

export async function addMemory(coupleId: string, myId: string, text: string, image?: { uri: string; mimeType?: string | null }) {
  let image_path: string | null = null;
  if (image) {
    const ext = image.mimeType?.split('/')[1] ?? 'jpg';
    image_path = `${coupleId}/${Date.now()}.${ext}`;
    const body = await fetch(image.uri).then((r) => r.arrayBuffer());
    const { error } = await supabase.storage.from('memories').upload(image_path, body, { contentType: image.mimeType ?? 'image/jpeg' });
    if (error) throw error;
  }
  const { error } = await supabase.from('memories').insert({ couple_id: coupleId, author_id: myId, text, image_path });
  if (error) throw error;
}
