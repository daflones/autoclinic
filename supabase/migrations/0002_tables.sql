-- ============================================================
-- Automaclinic CRM – Migração 0002: Tabelas principais
-- Requer: 0001_base.sql
-- ============================================================

-- Clínicas ----------------------------------------------------
create table if not exists public.clinicas (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null unique references public.profiles(id) on delete cascade,
  nome text not null,
  documento text,
  telefone text,
  email text,
  site text,
  endereco jsonb default '{}'::jsonb,
  configuracoes jsonb default jsonb_build_object(
    'fuso_horario','America/Sao_Paulo',
    'duracao_padrao_consulta', 60,
    'horario_funcionamento', '{}'::jsonb
  ),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profissionais ----------------------------------------------
create table if not exists public.profissionais_clinica (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  profile_id uuid references public.profiles(id) on delete set null,
  nome text not null,
  documento text,
  email text,
  telefone text,
  whatsapp text,
  data_nascimento date,
  sexo sexo_paciente_enum default 'nao_informado',
  bio text,
  foto_url text,
  especialidades text[] default '{}',
  conselho text,
  registro_profissional text,
  modalidade modalidade_atendimento_enum default 'hibrido',
  percentual_comissao numeric(5,2) default 0,
  meta_mensal numeric(14,2),
  horario_atendimento jsonb default '{}'::jsonb,
  status estado_profissional_enum default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pacientes ---------------------------------------------------
create table if not exists public.pacientes (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  responsavel_profissional_id uuid references public.profissionais_clinica(id),
  nome_completo text not null,
  nome_social text,
  documento text unique,
  data_nascimento date,
  sexo sexo_paciente_enum default 'nao_informado',
  email text,
  telefone text,
  whatsapp text,
  endereco jsonb default '{}'::jsonb,
  alergias text,
  restricoes text,
  observacoes text,
  status estado_paciente_enum default 'ativo',
  tags text[] default '{}',
  fonte_captacao text,
  data_primeiro_atendimento date,
  data_ultimo_atendimento date,
  consentimento_assinado boolean default false,
  consentimento_data timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles(id)
);

-- Categorias de procedimentos --------------------------------
create table if not exists public.categorias_procedimento (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  nome text not null,
  icone text,
  cor text default '#C265A3',
  descricao text,
  ordem int default 0,
  ativa boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Procedimentos ----------------------------------------------
create table if not exists public.procedimentos (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  categoria_id uuid references public.categorias_procedimento(id) on delete set null,
  nome text not null,
  codigo text unique,
  descricao text,
  duracao_minutos int not null default 60,
  intervalo_recuperacao_minutos int default 0,
  valor_base numeric(14,2) default 0,
  valor_promocional numeric(14,2),
  cuidados_pre text,
  cuidados_pos text,
  contraindicacoes text,
  materiais_padrao jsonb default '[]'::jsonb,
  anexos_padrao jsonb default '[]'::jsonb,
  ativo boolean default true,
  destaque boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Planos de tratamento ---------------------------------------
create table if not exists public.planos_tratamento (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  responsavel_profissional_id uuid references public.profissionais_clinica(id),
  titulo text not null,
  descricao text,
  status status_plano_tratamento_enum default 'rascunho',
  validade_dias int default 30,
  total_previsto numeric(14,2) default 0,
  total_pago numeric(14,2) default 0,
  observacoes text,
  criado_por uuid default auth.uid() references public.profiles(id),
  aprovado_por uuid references public.profiles(id),
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planos_tratamento_itens (
  id uuid primary key default uuid_generate_v4(),
  plano_id uuid not null references public.planos_tratamento(id) on delete cascade,
  procedimento_id uuid references public.procedimentos(id),
  descricao_personalizada text,
  quantidade int not null default 1,
  ordem int not null default 0,
  valor_unitario numeric(14,2) not null default 0,
  desconto_percentual numeric(5,2) default 0,
  total numeric(14,2) generated always as
    ((valor_unitario * quantidade) * (1 - desconto_percentual/100)) stored,
  observacoes text
);

-- Agendamentos ------------------------------------------------
create table if not exists public.agendamentos_clinica (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid references public.pacientes(id),
  profissional_id uuid references public.profissionais_clinica(id),
  plano_tratamento_id uuid references public.planos_tratamento(id) on delete set null,
  procedimento_id uuid references public.procedimentos(id) on delete set null,
  titulo text not null,
  descricao text,
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  sala text,
  status status_agendamento_enum default 'agendado',
  origem text,
  lembrete_enviado boolean default false,
  confirmar_paciente boolean default false,
  confirmar_profissional boolean default false,
  notas_pos_atendimento text,
  follow_up_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessões de tratamento --------------------------------------
create table if not exists public.sessoes_tratamento (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  plano_tratamento_id uuid references public.planos_tratamento(id) on delete cascade,
  agendamento_id uuid references public.agendamentos_clinica(id) on delete set null,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.profissionais_clinica(id),
  procedimento_id uuid references public.procedimentos(id),
  status status_sessao_enum default 'planejada',
  inicio_previsto timestamptz,
  termino_previsto timestamptz,
  inicio_real timestamptz,
  termino_real timestamptz,
  duracao_minutos int,
  observacoes text,
  dores_reportadas text,
  anexo_checklist jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prontuários -------------------------------------------------
create table if not exists public.prontuarios_clinicos (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  sessao_id uuid references public.sessoes_tratamento(id) on delete set null,
  profissional_id uuid references public.profissionais_clinica(id),
  tipo tipo_documento_clinico_enum not null,
  titulo text not null,
  conteudo jsonb not null default '{}'::jsonb,
  arquivos jsonb default '[]'::jsonb,
  visibilidade text default 'restrita',
  assinatura_url text,
  assinado_em timestamptz,
  criado_por uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Anexos ------------------------------------------------------
create table if not exists public.anexos_clinicos (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.profissionais_clinica(id),
  sessao_id uuid references public.sessoes_tratamento(id),
  tipo text,
  titulo text,
  descricao text,
  storage_bucket text not null default 'clinica',
  storage_path text not null,
  metadata jsonb default '{}'::jsonb,
  criado_por uuid default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Comunicações automatizadas --------------------------------
create table if not exists public.comunicacoes_paciente (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid references public.pacientes(id) on delete cascade,
  profissional_id uuid references public.profissionais_clinica(id),
  canal text not null,
  titulo text,
  mensagem text not null,
  status text default 'pendente',
  tentativa int default 0,
  enviado_em timestamptz,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
