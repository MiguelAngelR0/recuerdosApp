import { Memory, supabase } from './supabase';

export type MemoryItem = Memory & { url?: string };
export type PickedImage = { base64?: string | null; mimeType?: string | null };

// De arriba abajo de la enredadera: el de mayor posición primero.
export async function loadMemories(): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('position', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .returns<Memory[]>();
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

// En el móvil, fetch() de un archivo local devuelve 0 bytes: la foto se sube vacía.
// Por eso el selector nos da la foto en base64 y aquí la pasamos a bytes.
function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function uploadPhoto(coupleId: string, image: PickedImage) {
  if (!image.base64) throw new Error('No se pudo leer la foto');
  const ext = image.mimeType?.split('/')[1] ?? 'jpg';
  const path = `${coupleId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('memories').upload(path, base64ToBytes(image.base64), { contentType: image.mimeType ?? 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function addMemory(coupleId: string, myId: string, fields: { text: string; happenedOn: string | null; image?: PickedImage }) {
  const image_path = fields.image ? await uploadPhoto(coupleId, fields.image) : null;
  const { error } = await supabase
    .from('memories')
    .insert({ couple_id: coupleId, author_id: myId, text: fields.text, happened_on: fields.happenedOn, image_path, position: Date.now() / 1000 });
  if (error) throw error;
}

export async function updateMemory(m: Memory, fields: { text: string; happenedOn: string | null; image?: PickedImage }) {
  const image_path = fields.image ? await uploadPhoto(m.couple_id, fields.image) : m.image_path;
  const { error } = await supabase.from('memories').update({ text: fields.text, happened_on: fields.happenedOn, image_path }).eq('id', m.id);
  if (error) throw error;
  if (fields.image && m.image_path) await supabase.storage.from('memories').remove([m.image_path]);
}

export async function deleteMemory(m: Memory) {
  const { error } = await supabase.from('memories').delete().eq('id', m.id);
  if (error) throw error;
  if (m.image_path) await supabase.storage.from('memories').remove([m.image_path]);
}

// ids de arriba abajo de la enredadera.
export async function reorderMemories(ids: string[]) {
  const { error } = await supabase.rpc('reorder_memories', { ids });
  if (error) throw error;
}

// "12 mar" si es de este año; "12 mar 2024" si no.
export function formatMemoryDate(m: Memory) {
  const d = m.happened_on ? new Date(`${m.happened_on}T12:00:00`) : new Date(m.created_at);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
