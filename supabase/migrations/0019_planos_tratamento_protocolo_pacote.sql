-- ============================================================
-- Automaclinic CRM – Migração 0019: Planos de Tratamento vinculados a Protocolos/Pacotes
-- ============================================================

alter table public.planos_tratamento
  add column if not exists protocolo_pacote_id uuid;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'planos_tratamento_protocolo_pacote_id_fkey'
  ) then
    alter table public.planos_tratamento
      add constraint planos_tratamento_protocolo_pacote_id_fkey
      foreign key (protocolo_pacote_id)
      references public.protocolos_pacotes(id)
      on delete set null;
  end if;
end $$;

create index if not exists planos_tratamento_protocolo_pacote_id_idx
  on public.planos_tratamento (protocolo_pacote_id);
