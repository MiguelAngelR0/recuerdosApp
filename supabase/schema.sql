-- RecuerdosApp: pega este archivo entero en Supabase > SQL Editor y pulsa "Run".

-- Parejas -------------------------------------------------------------------
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- Perfiles (uno por usuario) -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'Yo',
  couple_id uuid references public.couples on delete set null,
  character text not null default 'pollito' check (character in ('pollito', 'osito')),
  status text not null default 'durmiendo'
    check (status in ('ejercicio', 'estudiando', 'durmiendo', 'trabajando', 'comiendo', 'extrano')),
  status_at timestamptz
);

-- Recuerdos -------------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  text text not null default '',
  image_path text,
  created_at timestamptz not null default now()
);

-- Fecha en que pasó y orden en la enredadera (más alto = más arriba)
alter table public.memories add column if not exists happened_on date;
alter table public.memories add column if not exists position double precision;
update public.memories set position = extract(epoch from created_at) where position is null;
alter table public.memories alter column position set default extract(epoch from now());

-- Tareas ----------------------------------------------------------------------
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  text text not null,
  done boolean not null default false,
  assigned_to uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

-- Token de notificaciones push del móvil
alter table public.profiles add column if not exists push_token text;

-- Temporizador compartido (una rutina por pareja) ---------------------------------
-- phases: [{ "label": "Estudiar", "seconds": 1500 }, ...]; se repite `rounds` veces.
-- Corriendo: tiempo = paused_elapsed + (ahora - started_at). En pausa: started_at es null.
create table if not exists public.timers (
  couple_id uuid primary key references public.couples on delete cascade,
  phases jsonb not null default '[{"label":"Estudiar","seconds":1500},{"label":"Descansar","seconds":300}]',
  rounds int not null default 4 check (rounds between 1 and 20),
  started_at timestamptz,
  paused_elapsed double precision not null default 0,
  updated_by uuid references public.profiles on delete set null,
  updated_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse --------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Yo'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pareja del usuario actual ---------------------------------------------------
create or replace function public.my_couple()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.profiles where id = auth.uid();
$$;

-- Crear pareja (el que la crea elige si es pollito u osito) --------------------
drop function if exists public.create_couple();
create or replace function public.create_couple(chosen text default 'pollito')
returns text language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  new_code text;
begin
  if chosen not in ('pollito', 'osito') then
    chosen := 'pollito';
  end if;
  insert into public.couples default values returning id, code into new_id, new_code;
  update public.profiles set couple_id = new_id, character = chosen where id = auth.uid();
  return new_code;
end;
$$;

-- Unirse con el código (el que se une es el personaje que queda libre) --------
create or replace function public.join_couple(join_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  members int;
  taken text;
begin
  select id into target from public.couples where code = upper(join_code);
  if target is null then
    raise exception 'no_couple';
  end if;
  select count(*) into members from public.profiles where couple_id = target;
  if members >= 2 then
    raise exception 'no_couple';
  end if;
  select character into taken from public.profiles where couple_id = target limit 1;
  update public.profiles
    set couple_id = target, character = case when taken = 'osito' then 'pollito' else 'osito' end
    where id = auth.uid();
end;
$$;

-- Intercambiar personajes (el pollito pasa a ser osito y al revés) ------------
create or replace function public.swap_characters()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
    set character = case when character = 'pollito' then 'osito' else 'pollito' end
    where couple_id = public.my_couple();
end;
$$;

-- Seguridad: cada pareja solo ve lo suyo ----------------------------------------
alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.todos enable row level security;
alter table public.timers enable row level security;

drop policy if exists "ver mi pareja" on public.couples;
create policy "ver mi pareja" on public.couples for select using (id = public.my_couple());

drop policy if exists "ver perfiles" on public.profiles;
create policy "ver perfiles" on public.profiles for select
  using (id = auth.uid() or couple_id = public.my_couple());
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update using (id = auth.uid());

-- Los dos podéis ver, editar y borrar cualquier recuerdo; al crearlo, el autor eres tú.
drop policy if exists "recuerdos de la pareja" on public.memories;
drop policy if exists "recuerdos: ver" on public.memories;
create policy "recuerdos: ver" on public.memories for select using (couple_id = public.my_couple());
drop policy if exists "recuerdos: crear" on public.memories;
create policy "recuerdos: crear" on public.memories for insert
  with check (couple_id = public.my_couple() and author_id = auth.uid());
drop policy if exists "recuerdos: editar" on public.memories;
create policy "recuerdos: editar" on public.memories for update
  using (couple_id = public.my_couple()) with check (couple_id = public.my_couple());
drop policy if exists "recuerdos: borrar" on public.memories;
create policy "recuerdos: borrar" on public.memories for delete using (couple_id = public.my_couple());

-- Reordenar la enredadera: recibe los ids de arriba abajo.
create or replace function public.reorder_memories(ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare
  n int := coalesce(array_length(ids, 1), 0);
begin
  for i in 1..n loop
    update public.memories set position = n - i + 1
      where id = ids[i] and couple_id = public.my_couple();
  end loop;
end;
$$;

drop policy if exists "tareas de la pareja" on public.todos;
create policy "tareas de la pareja" on public.todos for all
  using (couple_id = public.my_couple())
  with check (couple_id = public.my_couple());

drop policy if exists "temporizador de la pareja" on public.timers;
create policy "temporizador de la pareja" on public.timers for all
  using (couple_id = public.my_couple())
  with check (couple_id = public.my_couple());

-- Fotos: bucket privado, cada pareja en su carpeta ------------------------------
insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

drop policy if exists "fotos de la pareja (ver)" on storage.objects;
create policy "fotos de la pareja (ver)" on storage.objects for select
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple()::text);
drop policy if exists "fotos de la pareja (borrar)" on storage.objects;
create policy "fotos de la pareja (borrar)" on storage.objects for delete
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple()::text);
drop policy if exists "fotos de la pareja (subir)" on storage.objects;
create policy "fotos de la pareja (subir)" on storage.objects for insert
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = public.my_couple()::text);

-- Tiempo real (estados, recuerdos y tareas al momento) ---------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.memories; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.todos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.timers; exception when duplicate_object then null; end;
end $$;
