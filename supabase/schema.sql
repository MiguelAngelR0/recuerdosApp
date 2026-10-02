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

-- Crear pareja (el que la crea es el pollito) ----------------------------------
create or replace function public.create_couple()
returns text language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  new_code text;
begin
  insert into public.couples default values returning id, code into new_id, new_code;
  update public.profiles set couple_id = new_id, character = 'pollito' where id = auth.uid();
  return new_code;
end;
$$;

-- Unirse con el código (el que se une es el osito) -----------------------------
create or replace function public.join_couple(join_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  members int;
begin
  select id into target from public.couples where code = upper(join_code);
  if target is null then
    raise exception 'no_couple';
  end if;
  select count(*) into members from public.profiles where couple_id = target;
  if members >= 2 then
    raise exception 'no_couple';
  end if;
  update public.profiles set couple_id = target, character = 'osito' where id = auth.uid();
end;
$$;

-- Seguridad: cada pareja solo ve lo suyo ----------------------------------------
alter table public.couples enable row level security;
alter table public.profiles enable row level security;
alter table public.memories enable row level security;
alter table public.todos enable row level security;

drop policy if exists "ver mi pareja" on public.couples;
create policy "ver mi pareja" on public.couples for select using (id = public.my_couple());

drop policy if exists "ver perfiles" on public.profiles;
create policy "ver perfiles" on public.profiles for select
  using (id = auth.uid() or couple_id = public.my_couple());
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update using (id = auth.uid());

drop policy if exists "recuerdos de la pareja" on public.memories;
create policy "recuerdos de la pareja" on public.memories for all
  using (couple_id = public.my_couple())
  with check (couple_id = public.my_couple() and author_id = auth.uid());

drop policy if exists "tareas de la pareja" on public.todos;
create policy "tareas de la pareja" on public.todos for all
  using (couple_id = public.my_couple())
  with check (couple_id = public.my_couple());

-- Fotos: bucket privado, cada pareja en su carpeta ------------------------------
insert into storage.buckets (id, name, public)
values ('memories', 'memories', false)
on conflict (id) do nothing;

drop policy if exists "fotos de la pareja (ver)" on storage.objects;
create policy "fotos de la pareja (ver)" on storage.objects for select
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
end $$;
