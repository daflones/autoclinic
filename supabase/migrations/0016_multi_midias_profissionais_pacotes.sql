-- ============================================================
-- Automaclinic CRM – Migração 0016: Multi-mídias (Profissionais + Protocolos/Pacotes)
-- ============================================================

-- 1) Profissionais: tabela de mídias ----------------------------------------
create table if not exists public.profissional_midias (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  profissional_id uuid not null references public.profissionais_clinica(id) on delete cascade,
  tipo text not null default 'foto',
  storage_bucket text not null,
  storage_path text not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profissional_midias_admin_idx
  on public.profissional_midias(admin_profile_id);

create index if not exists profissional_midias_profissional_idx
  on public.profissional_midias(profissional_id);

alter table public.profissional_midias enable row level security;

create policy profissional_midias_policy on public.profissional_midias
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create trigger touch_profissional_midias before update on public.profissional_midias
  for each row execute procedure public.touch_updated_at();

-- Backfill: copiar foto_url existente para profissional_midias (se ainda não existir)
insert into public.profissional_midias (admin_profile_id, profissional_id, tipo, storage_bucket, storage_path, label)
select
  p.admin_profile_id,
  p.id as profissional_id,
  'foto' as tipo,
  'profissionais-midias' as storage_bucket,
  p.foto_url as storage_path,
  'Foto' as label
from public.profissionais_clinica p
where p.foto_url is not null
  and p.foto_url <> ''
  and not exists (
    select 1 from public.profissional_midias pm
    where pm.profissional_id = p.id
      and pm.storage_path = p.foto_url
  );


-- 2) Protocolos/Pacotes: tabela de mídias -----------------------------------
create table if not exists public.protocolo_pacote_midias (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  protocolo_pacote_id uuid not null references public.protocolos_pacotes(id) on delete cascade,
  tipo text not null default 'imagem',
  storage_bucket text not null,
  storage_path text not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists protocolo_pacote_midias_admin_idx
  on public.protocolo_pacote_midias(admin_profile_id);

create index if not exists protocolo_pacote_midias_protocolo_idx
  on public.protocolo_pacote_midias(protocolo_pacote_id);

alter table public.protocolo_pacote_midias enable row level security;

create policy protocolo_pacote_midias_policy on public.protocolo_pacote_midias
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create trigger touch_protocolo_pacote_midias before update on public.protocolo_pacote_midias
  for each row execute procedure public.touch_updated_at();

-- Backfill: copiar imagem_path existente para protocolo_pacote_midias (se ainda não existir)
insert into public.protocolo_pacote_midias (admin_profile_id, protocolo_pacote_id, tipo, storage_bucket, storage_path, label)
select
  pp.admin_profile_id,
  pp.id as protocolo_pacote_id,
  'imagem' as tipo,
  'pacotes-midias' as storage_bucket,
  pp.imagem_path as storage_path,
  'Imagem' as label
from public.protocolos_pacotes pp
where pp.imagem_path is not null
  and pp.imagem_path <> ''
  and not exists (
    select 1 from public.protocolo_pacote_midias ppm
    where ppm.protocolo_pacote_id = pp.id
      and ppm.storage_path = pp.imagem_path
  );
