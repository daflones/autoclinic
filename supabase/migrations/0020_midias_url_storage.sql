-- ============================================================
-- Automaclinic CRM – Migração 0020: URLs públicas de mídia (Storage)
-- ============================================================

-- Função para montar URL pública do Supabase Storage a partir de bucket/path.
-- Requer configurar o setting: app.supabase_url (ex: https://xxxx.supabase.co)
create or replace function public.storage_public_url(bucket text, object_path text)
returns text
language sql
stable
as $$
  select case
    when coalesce(trim(bucket), '') = '' then null
    when coalesce(trim(object_path), '') = '' then null
    when coalesce(trim(current_setting('app.supabase_url', true)), '') = '' then null
    else rtrim(current_setting('app.supabase_url', true), '/')
      || '/storage/v1/object/public/'
      || trim(bucket)
      || '/'
      || ltrim(trim(object_path), '/')
  end;
$$;

create or replace function public.set_midias_url_from_storage()
returns trigger
language plpgsql
as $$
begin
  -- Mantém como jsonb para permitir extensões futuras.
  new.midias_url = case
    when public.storage_public_url(new.storage_bucket, new.storage_path) is null then '{}'::jsonb
    else jsonb_build_object(
      'public_url', public.storage_public_url(new.storage_bucket, new.storage_path),
      'bucket', new.storage_bucket,
      'path', new.storage_path
    )
  end;
  return new;
end;
$$;

-- 1) anexos_clinicos ---------------------------------------------------------
alter table public.anexos_clinicos
  add column if not exists midias_url jsonb not null default '{}'::jsonb;

drop trigger if exists anexos_clinicos_set_midias_url on public.anexos_clinicos;
create trigger anexos_clinicos_set_midias_url
before insert or update of storage_bucket, storage_path
on public.anexos_clinicos
for each row execute procedure public.set_midias_url_from_storage();

update public.anexos_clinicos
set midias_url = jsonb_build_object(
  'public_url', public.storage_public_url(storage_bucket, storage_path),
  'bucket', storage_bucket,
  'path', storage_path
)
where coalesce(trim(storage_bucket), '') <> ''
  and coalesce(trim(storage_path), '') <> '';

-- 2) paciente_fotos -----------------------------------------------------------
alter table public.paciente_fotos
  add column if not exists midias_url jsonb not null default '{}'::jsonb;

drop trigger if exists paciente_fotos_set_midias_url on public.paciente_fotos;
create trigger paciente_fotos_set_midias_url
before insert or update of storage_bucket, storage_path
on public.paciente_fotos
for each row execute procedure public.set_midias_url_from_storage();

update public.paciente_fotos
set midias_url = jsonb_build_object(
  'public_url', public.storage_public_url(storage_bucket, storage_path),
  'bucket', storage_bucket,
  'path', storage_path
)
where coalesce(trim(storage_bucket), '') <> ''
  and coalesce(trim(storage_path), '') <> '';

-- 3) profissional_midias ------------------------------------------------------
alter table public.profissional_midias
  add column if not exists midias_url jsonb not null default '{}'::jsonb;

drop trigger if exists profissional_midias_set_midias_url on public.profissional_midias;
create trigger profissional_midias_set_midias_url
before insert or update of storage_bucket, storage_path
on public.profissional_midias
for each row execute procedure public.set_midias_url_from_storage();

update public.profissional_midias
set midias_url = jsonb_build_object(
  'public_url', public.storage_public_url(storage_bucket, storage_path),
  'bucket', storage_bucket,
  'path', storage_path
)
where coalesce(trim(storage_bucket), '') <> ''
  and coalesce(trim(storage_path), '') <> '';

-- 4) protocolo_pacote_midias --------------------------------------------------
alter table public.protocolo_pacote_midias
  add column if not exists midias_url jsonb not null default '{}'::jsonb;

drop trigger if exists protocolo_pacote_midias_set_midias_url on public.protocolo_pacote_midias;
create trigger protocolo_pacote_midias_set_midias_url
before insert or update of storage_bucket, storage_path
on public.protocolo_pacote_midias
for each row execute procedure public.set_midias_url_from_storage();

update public.protocolo_pacote_midias
set midias_url = jsonb_build_object(
  'public_url', public.storage_public_url(storage_bucket, storage_path),
  'bucket', storage_bucket,
  'path', storage_path
)
where coalesce(trim(storage_bucket), '') <> ''
  and coalesce(trim(storage_path), '') <> '';
