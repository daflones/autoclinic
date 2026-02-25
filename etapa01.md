Vamos implantar novas features, usando algumas explicalções aqui.



Nos procedimentos, deveremos adicionar campos novos nas configurações para ia e no que é enviado para a coluna 


ALTER TABLE public.procedimentos
  ADD COLUMN IF NOT EXISTS ia_agenda_direto BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ia_descricao_estrategica TEXT,
  ADD COLUMN IF NOT EXISTS ia_beneficios TEXT,
  ADD COLUMN IF NOT EXISTS ia_indicacoes TEXT,
  ADD COLUMN IF NOT EXISTS ia_prova_social TEXT,
  ADD COLUMN IF NOT EXISTS ia_upsell_ids UUID[];


  Esse comando acima já foi executado e essas colunas agora existem, mas devem ser visualizadas e poder interagir no projeto.

  Na pagina de pacientes, foram adicionadas novas colunas que devem ser possivel visualizar ocrretamenten os detalhes ods pacientes e interagir com elas.


  ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS fase_conversao TEXT DEFAULT 'fase_1_engajamento',
  ADD COLUMN IF NOT EXISTS procedimento_interesse TEXT,
  ADD COLUMN IF NOT EXISTS regiao_interesse TEXT,
  ADD COLUMN IF NOT EXISTS ja_realizou_antes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dor_principal TEXT,
  ADD COLUMN IF NOT EXISTS nivel_interesse TEXT DEFAULT 'desconhecido',
  ADD COLUMN IF NOT EXISTS status_conversao TEXT DEFAULT 'em_atendimento',
  ADD COLUMN IF NOT EXISTS ultima_interacao_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();


📝 Explicação dos novos campos
fase_conversao → fase_1_engajamento | fase_2_qualificacao | fase_3_direcionamento | fase_4_prova_confianca | fase_5_convite_agendamento | fase_6_pre_agendamento
procedimento_interesse → nome do procedimento identificado (diferente de produto_interesse que é texto livre)
regiao_interesse → região do corpo mencionada pelo lead (ex: abdômen, face, pernas)
ja_realizou_antes → boolean se o lead já fez algum procedimento estético
dor_principal → queixa ou objetivo estético principal identificado
nivel_interesse → frio | morno | quente (classificação interna)
status_conversao → em_atendimento | encaminhado_agendamento | perdido | concluido


