-- ============================================================
-- Automaclinic CRM – Migração 0004: RLS, políticas e triggers
-- Requer: 0003_indexes.sql
-- ============================================================

-- Ativar Row Level Security ----------------------------------
alter table public.clinicas enable row level security;
alter table public.profissionais_clinica enable row level security;
alter table public.pacientes enable row level security;
alter table public.categorias_procedimento enable row level security;
alter table public.procedimentos enable row level security;
alter table public.planos_tratamento enable row level security;
alter table public.planos_tratamento_itens enable row level security;
alter table public.agendamentos_clinica enable row level security;
alter table public.sessoes_tratamento enable row level security;
alter table public.prontuarios_clinicos enable row level security;
alter table public.anexos_clinicos enable row level security;
alter table public.comunicacoes_paciente enable row level security;
alter table public.profiles enable row level security;

-- Políticas multi-tenant base -------------------------------
create policy clinicas_policy on public.clinicas
  for all using (admin_profile_id = public.app_admin_profile_id())
  with check (admin_profile_id = public.app_admin_profile_id());

create policy profissionais_policy on public.profissionais_clinica
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy pacientes_policy on public.pacientes
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy categorias_policy on public.categorias_procedimento
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy procedimentos_policy on public.procedimentos
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy planos_policy on public.planos_tratamento
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy plano_itens_policy on public.planos_tratamento_itens
  for all using (
    exists (
      select 1 from public.planos_tratamento pt
      where pt.id = planos_tratamento_itens.plano_id
        and public.match_admin_profile(pt.admin_profile_id)
    )
  )
  with check (
    exists (
      select 1 from public.planos_tratamento pt
      where pt.id = planos_tratamento_itens.plano_id
        and public.match_admin_profile(pt.admin_profile_id)
    )
  );

create policy agendamentos_policy on public.agendamentos_clinica
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy sessoes_policy on public.sessoes_tratamento
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy prontuarios_policy on public.prontuarios_clinicos
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy anexos_policy on public.anexos_clinicos
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy comunicacoes_policy on public.comunicacoes_paciente
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create policy profiles_self_manage on public.profiles
  for all using (id = auth.uid())
  with check (id = auth.uid());

-- Triggers de atualização de updated_at ---------------------
create trigger touch_clinicas before update on public.clinicas
  for each row execute procedure public.touch_updated_at();

create trigger touch_profissionais before update on public.profissionais_clinica
  for each row execute procedure public.touch_updated_at();

create trigger touch_pacientes before update on public.pacientes
  for each row execute procedure public.touch_updated_at();

create trigger touch_planos before update on public.planos_tratamento
  for each row execute procedure public.touch_updated_at();

create trigger touch_agendamentos before update on public.agendamentos_clinica
  for each row execute procedure public.touch_updated_at();

create trigger touch_sessoes before update on public.sessoes_tratamento
  for each row execute procedure public.touch_updated_at();

create trigger touch_prontuarios before update on public.prontuarios_clinicos
  for each row execute procedure public.touch_updated_at();
