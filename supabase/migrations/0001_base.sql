-- ============================================================
-- Automaclinic CRM – Migração 0001: Bases, extensões e tipos
-- ============================================================

-- Extensões essenciais -------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Tipos enumerados -----------------------------------------------------------
create type public.sexo_paciente_enum as enum ('feminino','masculino','outro','nao_informado');
create type public.estado_paciente_enum as enum ('ativo','inativo','arquivado');
create type public.estado_profissional_enum as enum ('ativo','inativo','ferias','afastado');
create type public.modalidade_atendimento_enum as enum ('presencial','online','hibrido');
create type public.status_agendamento_enum as enum (
  'agendado','confirmado','check_in','em_andamento','concluido',
  'cancelado','nao_compareceu','remarcado'
);
create type public.status_plano_tratamento_enum as enum (
  'rascunho','em_aprovacao','aprovado','em_execucao','concluido','cancelado'
);
create type public.status_sessao_enum as enum ('planejada','em_andamento','concluida','cancelada','nao_compareceu');
create type public.tipo_documento_clinico_enum as enum ('anamnese','evolucao','prescricao','consentimento','laudo','outro');

-- Funções auxiliares --------------------------------------------------------
create or replace function public.app_admin_profile_id()
returns uuid
language sql
stable
security invoker
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'admin_profile_id','')::uuid,
    nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
  );
$$;

create or replace function public.match_admin_profile(target uuid)
returns boolean
language sql
stable
security invoker
as $$
  select target = public.app_admin_profile_id();
$$;

-- Tabela base de perfis (compatível com Supabase Auth) -----------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  email text not null unique,
  full_name text,
  avatar_url text,
  role text default 'admin' check (role in ('admin','profissional','recepcao','gestor')),
  status text default 'ativo' check (status in ('ativo','inativo','suspenso')),
  admin_profile_id uuid references public.profiles(id) on delete set null,
  telefone text,
  plano_ativo boolean default false,
  plano_expira_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_admin_idx on public.profiles(admin_profile_id);

-- Função utilitária para atualizar updated_at --------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
