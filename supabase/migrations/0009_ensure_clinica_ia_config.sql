-- ============================================================
-- Automaclinic CRM – Migração 0009: Seed automática clinica_ia_config
-- Requer: 0008_clinica_ia_config_json.sql
-- ============================================================

-- Garante que sempre exista 1 row em public.clinica_ia_config por clínica.
-- Estratégia:
-- 1) Função idempotente public.ensure_clinica_ia_config(<admin_profile_id>)
-- 2) Trigger em public.clinicas para criar automaticamente ao inserir uma clínica
-- 3) Backfill para clinicas já existentes

create or replace function public.ensure_clinica_ia_config(p_admin_profile_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if p_admin_profile_id is null then
    return;
  end if;

  insert into public.clinica_ia_config (admin_profile_id)
  values (p_admin_profile_id)
  on conflict (admin_profile_id) do nothing;
end;
$$;

-- Permissões mínimas para execução
revoke all on function public.ensure_clinica_ia_config(uuid) from public;
grant execute on function public.ensure_clinica_ia_config(uuid) to authenticated;

-- Trigger para criar config no insert/update de clinicas
create or replace function public.trg_clinicas_ensure_ia_config()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.ensure_clinica_ia_config(new.admin_profile_id);
  return new;
end;
$$;

drop trigger if exists ensure_clinica_ia_config_on_clinicas on public.clinicas;
create trigger ensure_clinica_ia_config_on_clinicas
after insert or update of admin_profile_id on public.clinicas
for each row
execute procedure public.trg_clinicas_ensure_ia_config();

-- Backfill para clinicas existentes
insert into public.clinica_ia_config (admin_profile_id)
select c.admin_profile_id
from public.clinicas c
where c.admin_profile_id is not null
on conflict (admin_profile_id) do nothing;
