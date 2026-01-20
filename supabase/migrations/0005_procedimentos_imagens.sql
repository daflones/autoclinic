-- ============================================================
-- Automaclinic CRM – Migração 0005: Procedimentos (detalhes + imagens) e bucket storage
-- Requer: 0004_rls_triggers.sql
-- ============================================================

-- 1) Campos novos no procedimento --------------------------------
alter table public.procedimentos
  add column if not exists detalhes text,
  add column if not exists imagens jsonb not null default '[]'::jsonb;

-- 2) Bucket do Storage -------------------------------------------
-- Observação: isso usa o schema storage (nativo do Supabase)
insert into storage.buckets (id, name, public)
values ('procedimento-imagens', 'procedimento-imagens', false)
on conflict (id) do nothing;

-- 3) Políticas do Storage (RLS em storage.objects) ----------------
-- Estratégia de multi-tenant por path:
--   procedimentos/<admin_profile_id>/<procedimento_id>/<arquivo>

-- Leitura
create policy "procedimento_imagens_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'procedimento-imagens'
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );

-- Upload
create policy "procedimento_imagens_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'procedimento-imagens'
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );

-- Update (caso use upsert)
create policy "procedimento_imagens_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'procedimento-imagens'
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  )
  with check (
    bucket_id = 'procedimento-imagens'
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );

-- Delete
create policy "procedimento_imagens_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'procedimento-imagens'
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );
