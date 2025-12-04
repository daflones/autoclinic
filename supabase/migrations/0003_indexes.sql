-- ============================================================
-- Automaclinic CRM – Migração 0003: Índices e constraints extras
-- Requer: 0002_tables.sql
-- ============================================================

-- Clínicas ----------------------------------------------------
create index if not exists clinicas_admin_profile_id_idx on public.clinicas(admin_profile_id);

-- Profissionais ----------------------------------------------
create index if not exists profissionais_admin_idx on public.profissionais_clinica(admin_profile_id);
create index if not exists profissionais_status_idx on public.profissionais_clinica(status);
create unique index if not exists profissionais_profile_id_unique
  on public.profissionais_clinica(profile_id)
  where profile_id is not null;

-- Pacientes ---------------------------------------------------
create index if not exists pacientes_admin_idx on public.pacientes(admin_profile_id);
create index if not exists pacientes_responsavel_idx on public.pacientes(responsavel_profissional_id);
create index if not exists pacientes_status_idx on public.pacientes(status);
create index if not exists pacientes_documento_idx on public.pacientes(documento);
create index if not exists pacientes_search_idx
  on public.pacientes using gin (to_tsvector('portuguese', nome_completo || ' ' || coalesce(nome_social,'')));

-- Categorias & Procedimentos ---------------------------------
create index if not exists categorias_proc_admin_idx on public.categorias_procedimento(admin_profile_id);
create index if not exists categorias_proc_ordem_idx on public.categorias_procedimento(ordem);
create index if not exists procedimentos_admin_idx on public.procedimentos(admin_profile_id);
create index if not exists procedimentos_categoria_idx on public.procedimentos(categoria_id);
create index if not exists procedimentos_nome_idx on public.procedimentos using gin (to_tsvector('portuguese', nome));

-- Planos de tratamento ---------------------------------------
create index if not exists planos_admin_idx on public.planos_tratamento(admin_profile_id);
create index if not exists planos_paciente_idx on public.planos_tratamento(paciente_id);
create index if not exists planos_status_idx on public.planos_tratamento(status);
create index if not exists plano_itens_plano_idx on public.planos_tratamento_itens(plano_id);
create index if not exists plano_itens_procedimento_idx on public.planos_tratamento_itens(procedimento_id);

-- Agendamentos & Sessões -------------------------------------
create index if not exists agendamentos_admin_idx on public.agendamentos_clinica(admin_profile_id);
create index if not exists agendamentos_paciente_idx on public.agendamentos_clinica(paciente_id);
create index if not exists agendamentos_profissional_idx on public.agendamentos_clinica(profissional_id);
create index if not exists agendamentos_intervalo_idx on public.agendamentos_clinica(data_inicio, data_fim);
create index if not exists agendamentos_status_idx on public.agendamentos_clinica(status);
create index if not exists sessoes_admin_idx on public.sessoes_tratamento(admin_profile_id);
create index if not exists sessoes_paciente_idx on public.sessoes_tratamento(paciente_id);
create index if not exists sessoes_profissional_idx on public.sessoes_tratamento(profissional_id);
create index if not exists sessoes_status_idx on public.sessoes_tratamento(status);

-- Prontuários & anexos ---------------------------------------
create index if not exists prontuarios_admin_idx on public.prontuarios_clinicos(admin_profile_id);
create index if not exists prontuarios_paciente_idx on public.prontuarios_clinicos(paciente_id);
create index if not exists prontuarios_tipo_idx on public.prontuarios_clinicos(tipo);
create index if not exists prontuarios_tsv_idx
  on public.prontuarios_clinicos using gin (to_tsvector('portuguese', titulo || ' ' || coalesce(conteudo::text,'')));
create index if not exists anexos_admin_idx on public.anexos_clinicos(admin_profile_id);
create index if not exists anexos_paciente_idx on public.anexos_clinicos(paciente_id);

-- Comunicações -----------------------------------------------
create index if not exists comunicacoes_admin_idx on public.comunicacoes_paciente(admin_profile_id);
create index if not exists comunicacoes_paciente_idx on public.comunicacoes_paciente(paciente_id);
create index if not exists comunicacoes_status_idx on public.comunicacoes_paciente(status);
