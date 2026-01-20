-- ============================================================
-- Migração 0011: Protocolos/Pacotes (CRUD fora da Config IA)
-- ============================================================

create table if not exists public.protocolos_pacotes (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  nome text not null,
  descricao text,
  preco numeric(14,2),
  itens text,
  imagem_path text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists protocolos_pacotes_admin_idx on public.protocolos_pacotes(admin_profile_id);
create index if not exists protocolos_pacotes_ativo_idx on public.protocolos_pacotes(ativo);

alter table public.protocolos_pacotes enable row level security;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'protocolos_pacotes'
      and policyname = 'protocolos_pacotes_policy'
  ) then
    create policy protocolos_pacotes_policy on public.protocolos_pacotes
      for all
      using (public.match_admin_profile(admin_profile_id))
      with check (public.match_admin_profile(admin_profile_id));
  end if;
end $$;

-- Trigger de updated_at
create trigger touch_protocolos_pacotes before update on public.protocolos_pacotes
  for each row execute procedure public.touch_updated_at();
