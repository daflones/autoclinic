create table if not exists public.profissionais_clinica_procedimentos (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null,
  profissional_id uuid not null,
  procedimento_id uuid not null,
  created_at timestamptz not null default now(),
  unique (admin_profile_id, profissional_id, procedimento_id),
  constraint profissionais_clinica_procedimentos_profissional_fk
    foreign key (profissional_id) references public.profissionais_clinica (id) on delete cascade,
  constraint profissionais_clinica_procedimentos_procedimento_fk
    foreign key (procedimento_id) references public.procedimentos (id) on delete cascade
);

alter table public.profissionais_clinica_procedimentos enable row level security;

create policy profissionais_procedimentos_policy on public.profissionais_clinica_procedimentos
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create index if not exists profissionais_clinica_procedimentos_admin_idx
  on public.profissionais_clinica_procedimentos (admin_profile_id);

create index if not exists profissionais_clinica_procedimentos_profissional_idx
  on public.profissionais_clinica_procedimentos (profissional_id);

create index if not exists profissionais_clinica_procedimentos_procedimento_idx
  on public.profissionais_clinica_procedimentos (procedimento_id);
