-- ============================================================
-- Automaclinic CRM – Migração 0017: Storage bucket + policies (pacientes-midias)
-- ============================================================

-- 1) Criar bucket (se não existir)
insert into storage.buckets (id, name, public)
values ('pacientes-midias', 'pacientes-midias', false)
on conflict (id) do nothing;

-- 2) Policies de acesso aos objetos do bucket (multi-tenant pelo prefixo admin_profile_id)
-- Observação: o path gerado pelo app é: {admin_profile_id}/...

-- Select (download/preview)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pacientes_midias_select'
  ) then
    execute $policy$
      create policy pacientes_midias_select
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'pacientes-midias'
        and split_part(name, '/', 1) = public.app_admin_profile_id()::text
      );
    $policy$;
  end if;
end $$;

-- Insert (upload)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pacientes_midias_insert'
  ) then
    execute $policy$
      create policy pacientes_midias_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'pacientes-midias'
        and split_part(name, '/', 1) = public.app_admin_profile_id()::text
      );
    $policy$;
  end if;
end $$;

-- Update (caso use upsert)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pacientes_midias_update'
  ) then
    execute $policy$
      create policy pacientes_midias_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'pacientes-midias'
        and split_part(name, '/', 1) = public.app_admin_profile_id()::text
      )
      with check (
        bucket_id = 'pacientes-midias'
        and split_part(name, '/', 1) = public.app_admin_profile_id()::text
      );
    $policy$;
  end if;
end $$;

-- Delete
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'pacientes_midias_delete'
  ) then
    execute $policy$
      create policy pacientes_midias_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'pacientes-midias'
        and split_part(name, '/', 1) = public.app_admin_profile_id()::text
      );
    $policy$;
  end if;
end $$;
