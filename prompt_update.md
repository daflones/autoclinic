Leia tudo isso como isntrução, você deve fazer um upgrade no que ja existe, mantendo instruções que ja temos para ia, coisas assim, isso é mais para a parte da clinica controlar.



Vamos aplicarm udanças para muitas paginas e criar paginas novas, formatos novos e estrutura nova.


Você deve analisar TODAS AS IMAGENS, UMA POR UMA que estão na pasta imagens. elas são cruciais para formar o contexto de melhoria e como estamos visualizando ela.

ANALISE UMA POR UMA DAS IMAGENS.

# 🏥 AUTOCLINIC — PROMPT COMPLETO DE EVOLUÇÃO DO SISTEMA

> **REGRA ABSOLUTA #1 — PRESERVAÇÃO DO EXISTENTE**
> Este projeto JÁ EXISTE e está em produção. Cada módulo descrito abaixo deve ser implementado **sobre o que já existe**, nunca descartando, nunca reescrevendo do zero, nunca quebrando funcionalidade já funcionando. O padrão é: identificar o que já há, expandir, melhorar e adicionar.
>
> **REGRA ABSOLUTA #2 — DESIGN INTOCÁVEL**
> As cores, tipografia, componentes Radix UI, sidebar, padrão de badges, padrão de modais e toda identidade visual existente devem ser 100% preservados. As imagens de referência são do sistema Clínica Experts e servem APENAS para orientar funcionalidades, layouts e fluxos — não para copiar a identidade visual deles.
>
> **REGRA ABSOLUTA #3 — STACK IMUTÁVEL**
> Não trocar nenhuma dependência existente. Apenas adicionar novas onde necessário.

---

## 📦 STACK EXISTENTE (NÃO ALTERAR)

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18.2.0 + TypeScript 5.2.0 + Vite 5.0.0 |
| Roteamento | React Router DOM 6.20.1 |
| Estado global | Zustand 4.5.7 |
| Queries/Cache | TanStack React Query 5.85.9 |
| Formulários | React Hook Form 7.62.0 + Zod 3.25.76 |
| UI | Tailwind CSS 3.4.0 + Radix UI + Lucide React 0.294.0 |
| Animações | Framer Motion 10.18.0 |
| Calendário | FullCalendar 6.1.9 + React Day Picker 9.11.0 |
| Gráficos | Recharts 2.8.0 + Chart.js 4.4.0 |
| Upload | Uppy 3.7.0 + React Dropzone 14.2.3 |
| Notificações | Sonner 1.2.4 |
| Drag & Drop | react-beautiful-dnd 13.1.1 |
| PDF | jspdf 3.0.3 + jspdf-autotable 5.0.2 |
| Backend | Node.js ES Modules + Express 5.1.0 |
| Banco | Supabase (PostgreSQL) + @supabase/supabase-js 2.76.1 |
| WhatsApp | whatsapp-web.js 1.34.1 + Evolution API |
| PWA | vite-plugin-pwa 1.0.3 |

## 📦 NOVAS DEPENDÊNCIAS A INSTALAR

```bash
# IA
npm install openai

# Editor Rich Text
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image \
  @tiptap/extension-link @tiptap/extension-text-align @tiptap/extension-color \
  @tiptap/extension-highlight @tiptap/extension-placeholder

# Drag & Drop de fichas (builder)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Comparativo antes/depois
npm install react-compare-slider

# Áudio / Transcrição
npm install wavesurfer.js

# QR Code
npm install react-qr-code

# Lista virtualizada (performance em listas longas 500+)
npm install @tanstack/react-virtual

# Máscara de input
npm install react-imask

# Crop de imagem
npm install react-easy-crop

# Assinatura digital
npm install react-signature-canvas

# PDF render
npm install react-pdf
```

---

## 🗄️ SCHEMA REAL DO SUPABASE — TABELAS EXISTENTES

> Usar SEMPRE os nomes reais abaixo. NUNCA recriar tabelas que já existem — usar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

| Tabela | Colunas chave relevantes |
|--------|--------------------------|
| `profiles` | `id`, `admin_profile_id`, `nome`, `email`, `role` |
| `pacientes` | `id`, `admin_profile_id`, `nome`, `nome_social`, `foto_url`, `whatsapp`, `email`, `cpf`, `data_nascimento`, `genero`, `status`, `tags` (array), `alergias`, `observacoes`, `endereco` (jsonb), `fase_conversao`, `origem`, `procedimento_interesse` |
| `profissionais_clinica` | `id`, `admin_profile_id`, `nome`, `foto_url`, `especialidades` (array), `percentual_comissao`, `horario_atendimento` (jsonb) |
| `procedimentos` | `id`, `admin_profile_id`, `nome`, `duracao_minutos`, `valor_base`, `categoria_id`, `materiais_padrao` (jsonb) |
| `categorias_procedimento` | `id`, `admin_profile_id`, `nome` |
| `agendamentos_clinica` | `id`, `admin_profile_id`, `paciente_id`, `profissional_id`, `procedimento_id`, `procedimentos_ids` (array), `data_inicio`, `data_fim`, `status` (enum), `sala` (text), `valor`, `descricao`, `is_avaliacao` |
| `sessoes_tratamento` | `id`, `admin_profile_id`, `agendamento_id`, `plano_tratamento_id`, `paciente_id`, `profissional_id`, `status`, `data_sessao` |
| `planos_tratamento` | `id`, `admin_profile_id`, `paciente_id`, `status` (enum: rascunho/ativo/concluido/cancelado) |
| `planos_tratamento_itens` | `id`, `plano_id`, `procedimento_id`, `quantidade`, `valor_unitario` |
| `prontuarios_clinicos` | `id`, `admin_profile_id`, `paciente_id`, `sessao_id`, `tipo` (enum), `conteudo` (jsonb) |
| `anexos_clinicos` | `id`, `admin_profile_id`, `paciente_id`, `sessao_id`, `storage_bucket`, `storage_path`, `midias_url` (jsonb) |
| `paciente_fotos` | `id`, `admin_profile_id`, `paciente_id`, `midias_url` (jsonb), `tipo` (antes/depois) |
| `protocolos_pacotes` | `id`, `admin_profile_id`, `nome`, `conteudo` (jsonb) |
| `comunicacoes_paciente` | `id`, `admin_profile_id`, `paciente_id`, `canal`, `status`, `mensagem` |
| `lista_espera_agendamentos` | `id`, `admin_profile_id`, `paciente_id`, `data_preferencial`, `observacoes` |
| `clinica_ia_config` | `id`, `admin_profile_id`, `config` (jsonb) |
| `whatsapp_conversas` | existente |
| `whatsapp_mensagens` | existente |
| `whatsapp_contatos` | existente |

> **Padrão multi-tenant obrigatório:** TODAS as novas tabelas devem ter:
> ```sql
> admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id()
> ```
> E RLS habilitado com policy baseada em `admin_profile_id = app_admin_profile_id()`.

---

## 🗺️ NOVAS ROTAS A ADICIONAR EM `App.tsx`

```
/agenda
/contatos
/contatos/:id
/contatos/:id/prontuario
/contatos/:id/informacoes
/contatos/:id/linha-do-tempo
/contatos/:id/crm
/contatos/:id/carteira
/contatos/:id/pacotes
/contatos/:id/saldo
/contatos/:id/financeiro
/contatos/:id/documentos
/contatos/:id/formularios
/atendimentos
/atendimentos/atestados
/atendimentos/guias
/atendimentos/cid
/vendas
/vendas/relatorio
/vendas/pacotes
/vendas/saldos
/vendas/orcamentos
/vendas/notas-fiscais
/financeiro
/financeiro/receber
/financeiro/pagar
/financeiro/extrato
/financeiro/competencia
/financeiro/fluxo-diario
/financeiro/fluxo-mensal
/financeiro/categorias
/financeiro/contas
/financeiro/metodos-pagamento
/financeiro/fechamentos
/financeiro/dre
/crm
/crm/oportunidades
/estoque
/estoque/lotes
/estoque/giro
/estoque/contagem
/estoque/itens-abertos
/estoque/compras
/estoque/marcas
/comissoes
/marketing
/site
/autochat
/autodocs
/configuracoes
```

---

## 🔧 REGRAS DE DESENVOLVIMENTO

1. 🚫 NÃO alterar cores, tipografia, sidebar, componentes visuais existentes
2. 🚫 NÃO quebrar WhatsApp, chat, Instagram, autenticação
3. 🚫 NÃO alterar estrutura base do `whatsapp-server.js` — apenas adicionar novas rotas no final
4. 🚫 NÃO recriar tabelas existentes — apenas `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
5. ✅ USAR `admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id()` em TODAS as novas tabelas
6. ✅ USAR nomes reais das tabelas: `agendamentos_clinica`, `profissionais_clinica`, `sessoes_tratamento`
7. ✅ MANTER `"type": "module"` — ESM em todo código novo
8. ✅ TODAS as queries via TanStack Query (`useQuery` / `useMutation`)
9. ✅ RLS habilitado em todas as novas tabelas
10. ✅ `@tanstack/react-virtual` para listas longas (551+ atendimentos, 153+ contatos, 181+ estoque)
11. ✅ Status badges do agendamento seguem `status_agendamento_enum` já existente: `agendado`, `confirmado`, `cancelado`, `concluido`, `nao_compareceu`, `aguardando`, `em_atendimento`, `remarcado`

---

---

# 📋 MÓDULOS DETALHADOS

---

## 🗓️ MÓDULO 1 — AGENDA

> **Já existe:** Página de agendamentos com FullCalendar funcional, modal básico de criação, integração com `agendamentos_clinica`. O que existe deve ser **expandido**, não substituído.

### 1.1 Layout Geral

**Sidebar esquerda colapsável** (nova — não substitui o calendário):
- Mini-calendário mensal usando **React Day Picker** (já instalado) para navegação rápida de datas
- Dia hoje destacado em roxo (cor primária do projeto)
- Data selecionada destacada, sincronizada com o FullCalendar
- Seção "**Filtros**" com label + "Limpar filtros" (link roxo, visível apenas quando há filtros ativos):
  - **Status** — dropdown com todas as opções do enum: Todos, Agendado, Confirmado, Em atendimento, Aguardando, Concluído, Não compareceu, Cancelado, Remarcado
  - **Profissional** — dropdown pesquisável, busca em `profissionais_clinica`, mostra foto circular + nome na opção selecionada
  - **Paciente** — dropdown pesquisável, busca em `pacientes`, mostra avatar + nome
  - **Convênio** — campo "Pesquise/Selecione" (dropdown pesquisável buscando `convenios`)
  - **Procedimento** — dropdown pesquisável buscando `procedimentos`
  - **Sala** — dropdown pesquisável buscando `salas_atendimento`
- Botão/link "Opções avançadas" no fim dos filtros (expandir para filtros extras como tags, origem, etc.)
- A sidebar deve ser totalmente colapsável com ícone de seta; quando colapsada, só o mini-calendário fica visível como ícone

**Header da Agenda:**
- Botão "**Hoje**" (texto simples, sem ícone)
- Setas de navegação `<` e `>` para avançar/retroceder período
- Range de datas exibido no centro (ex: "20 – 26 de abr. de 2025")
- Botão "**Lista de espera**" com ícone de ampulheta — abre um drawer lateral direito com registros de `lista_espera_agendamentos` (nome do paciente, data preferencial, observações, botão de agendar)
- Seletor de **vista** dropdown à direita: **Dia | Semana | Mês | Profissional | Sala | Programação** — o seletor ativo mostra ícone de calendário + nome da vista

**Área principal:** FullCalendar expandido com:
- Vista **Semana** (padrão): colunas por dia, eventos coloridos por status (cada status_agendamento_enum tem cor diferente)
- Vista **Por Profissional**: colunas por profissional (FullCalendar resource view), cada profissional com foto no header da coluna
- Vista **Por Sala**: colunas por sala de atendimento
- Vista **Programação**: lista vertical de agendamentos do dia/período selecionado
- Eventos no calendário mostram: bolinha colorida de status (ponto roxo/verde/vermelho/etc.) + nome do paciente + nome do procedimento abreviado + horário de início–fim
- Feriados nacionais brasileiros aparecem como banner colorido no topo do dia (ex: "Tiradentes" em rosa claro)
- Horários bloqueados aparecem com fundo listrado diagonal cinza, label "Horário bloqueado"

**Botão flutuante `+`** no canto inferior direito:
- Círculo roxo, 56px, ícone `+`
- Ao clicar, expande verticalmente um menu de 7 opções animado (Framer Motion, stagger de entrada):
  1. Novo agendamento (ícone calendário)
  2. Novo bloqueio de horário (ícone cadeado)
  3. Novo lembrete (ícone sino)
  4. Nova venda personalizada (ícone carrinho)
  5. Nova venda de crédito (ícone moeda)
  6. Nova venda de pacote (ícone pacote)
  7. Novo atendimento (ícone estetoscópio)
- Cada opção: texto à esquerda (dark bg tooltip) + ícone à direita em círculo roxo
- O `+` vira `×` ao abrir o menu

---

### 1.2 Modal de Novo Agendamento

> Expandir o modal existente. MANTER todos os campos que já funcionam. ADICIONAR os itens marcados como NOVO.

**Header do modal:**
- Título "Novo agendamento" + dois ícones de atalho: agendamento rápido e financeiro
- Botão fechar `×`

**Seletor de Tipo** (3 pills/tabs no topo):
- `Agendamento` (selecionado por padrão, fundo roxo)
- `Bloquear horário` (sem fundo)
- `Lembrete` (sem fundo)

**Seção "Dados básicos":**
- **Paciente** — campo com label + botão "+ Adicionar" à direita. Input tipo dropdown pesquisável. Lista dropdown mostra: avatar circular (foto ou inicial) + nome + subtexto do tipo. Selecionado aparece avatar + nome no campo.
- **Profissional** — dropdown com foto circular + nome. Ao lado esquerdo do campo de Sala.
- **Sala de atendimento** — dropdown pesquisável (NOVO). Opções buscadas da tabela `salas_atendimento`. Ao selecionar uma opção, aparece botão `+` para criar nova sala inline.
- **Convênio** — dropdown pesquisável "Pesquise/Selecione" (NOVO)
- **Observações** — textarea "Digite" (NOVO)
- **Teleconsulta** — toggle switch (NOVO), coluna `teleconsulta boolean` em `agendamentos_clinica`

**Seção "Procedimentos/Produtos":**
- Lista de linhas, cada linha: dropdown pesquisável "Nome" + input numérico "Qtd." + ícone lixeira
- Por padrão 1 linha vazia
- Link "+ Adicionar Procedimentos/Produtos" abaixo para adicionar mais linhas
- Ao selecionar procedimento, preenche automaticamente a quantidade default = 1

**Seção "Data"** (com chevron para expandir/colapsar):
- **Dia\*** — date picker com ícone calendário
- **Início\*** — time picker com ícone relógio
- **Fim\*** — time picker calculado automaticamente pela `duracao_minutos` do procedimento selecionado
- **Recorrência\*** — dropdown (NOVO):
  - Opções: "Não se repete" (padrão) / "A cada dia" / "A cada semana" / "A cada duas semanas" / "A cada mês" / "A cada bimestre"
  - Quando qualquer opção diferente de "Não se repete" é selecionada, aparecem dois campos adicionais:
    - **Termina\*** — dropdown: "Após" (default) / "Em data específica"
    - **Quantidade\*** — input numérico (ex: "1 ocorrência")
  - Salvar em coluna `recorrencia jsonb` da tabela `agendamentos_clinica`

**Seção "Formulário de pré-atendimento"** (NOVO, com chevron):
- Toggle "Agendar envio de formulário de pré-atendimento"
- Quando ativado, aparece dropdown **Modelo\*** com lista de fichas/formulários disponíveis (ex: "12. Atendimento Psicopedagogia")
- Salvar FK em `formulario_pre_id`

**Seção "Financeiro"** (NOVO, accordion expansível, mostra o total como subtítulo quando colapsado: "R$ 300,00"):
- Toggle "Criar comanda" (com ícone de ajuda `?`)
- Lista de itens: "1x [Procedimento]" + valor à direita
- **Total** em negrito + valor
- Persiste valor total em `agendamentos_clinica.valor`

**Rodapé:**
- Botão "**Salvar**" roxo centralizado

---

### 1.3 Painel Lateral de Detalhes do Evento (slide-in)

> Ao clicar em qualquer card no calendário, NÃO abrir modal central. Abrir um painel que desliza da direita, sobrepondo parcialmente o calendário (width ~400px, Framer Motion `x: "100%" → x: 0`).

**Estrutura do painel "Detalhes do evento":**
- Header: título "Detalhes do evento" + botão fechar `×`
- Linha 1: bolinha colorida (cor do status) + "**Agendamento**" em negrito + data completa + horário (ex: "Sex, 25 de abr de 2025 • 10:00 – 11:45")
- Linha 2: avatar circular do profissional + nome do profissional
- Linha 3: avatar circular do paciente + nome do paciente + ícone WhatsApp clicável (abre conversa existente no chat)
- Linha 4: ícone de status + label do status (ex: "Concluído" em verde / "Agendado" em azul)
- Linha 5: ícone de procedimento + "1x [Nome Procedimento]" + valor à direita (ex: "R$ 50,00")
- Linha 6 (se houver sala): ícone de localização `📍` + nome da sala (ex: "Sala 04")
- Linha 7 (se recorrente): ícone de link `🔗` + "Agendamento X de Y" (ex: "Agendamento 1 de 4")
- Linha 8: ícone de dinheiro + valor total (ex: "R$ 300,00")
- Separador
- Ações inline em linha: `✏️ Editar` | `□ Duplicar` | `🗑️ Excluir`
- Botão outline: "**Editar consumo de material**"
- Botão outline: "**Enviar formulário de pré atendimento**" (desabilitado em cinza se não houver formulário vinculado)
- **Rodapé com 2 botões roxos:**
  - "**Iniciar atendimento**" → cria registro em `sessoes_tratamento` e navega para `/contatos/:id/prontuario?sessao=:sessao_id`
  - "**Finalizar comanda**" → abre fluxo de pagamento

> Diferença entre os dois estados:
> - Quando status = `agendado` ou `confirmado`: botões são "Iniciar atendimento" + "Finalizar comanda"
> - Quando status = `concluido`: botões mudam para "Visualizar atendimento" + "Finalizar comanda"

**Novas colunas em `agendamentos_clinica`:**
```sql
ALTER TABLE agendamentos_clinica
  ADD COLUMN IF NOT EXISTS teleconsulta boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia jsonb,
  ADD COLUMN IF NOT EXISTS formulario_pre_id uuid REFERENCES fichas_templates(id),
  ADD COLUMN IF NOT EXISTS comanda_id uuid,
  ADD COLUMN IF NOT EXISTS sala_id uuid REFERENCES salas_atendimento(id),
  ADD COLUMN IF NOT EXISTS convenio_id uuid REFERENCES convenios(id);
```

**Nova tabela `salas_atendimento`:**
```sql
CREATE TABLE IF NOT EXISTS salas_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

## 👥 MÓDULO 2 — CONTATOS / PACIENTES

> **Já existe:** Listagem de pacientes com busca, cadastro e visualização básica. EXPANDIR, não substituir.

### 2.1 Menu Flyout da Sidebar (ao hover/click no item Contatos)

Ao clicar no ícone de Contatos na sidebar principal, abre um painel lateral animado com:
- Título "**Contatos**" em negrito
- Itens de menu em lista vertical:
  - **Pacientes** (selecionado por padrão, roxo)
  - Profissionais
  - Fornecedores
  - Leads
  - **Todos os contatos**
  - Aniversariantes
  - Frequência
  - ─────────────
  - Importar contatos
  - Mesclar contatos
  - Convidar colaboradores
- Animação suave de entrada (Framer Motion)

### 2.2 Listagem de Contatos

Layout:
- Header: título "**Listagem de contatos**" + contador "153 registros" (cinza)
- Botões à direita: "**Ações em lote**" (dropdown) + "**Exportar**" (dropdown com opções CSV/Excel)
- Linha de filtros: botão "+ **Adicionar filtro**" à esquerda + campo de busca "**Buscar**" à direita

Tabela com colunas:
| # | Coluna | Detalhe |
|---|--------|---------|
| ☐ | Checkbox | Seleção múltipla |
| — | Avatar + Nome + Tipo | Foto circular 40px. Nome em negrito. Subtexto "Paciente" ou "Profissional" em cinza |
| — | Etiquetas | Chips coloridos das `tags`. Ex: pill "Indicação" (borda roxa), pill "Libio" (borda cinza), "+1" se mais de 2 |
| — | Telefone | Número + ícone WhatsApp verde clicável |
| — | Ativo | Toggle switch verde/cinza |
| ⚙️ | Ações | Ícone de 3 pontos (menu: Editar, Excluir, Enviar mensagem, Ver histórico) |

- Virtualização com `@tanstack/react-virtual` para listas com 150+ registros
- Colunas sortáveis (ícone de diamante `◆` no header indicando ordenação)

### 2.3 Perfil do Paciente (página `/contatos/:id`)

Layout de duas colunas:

**Coluna esquerda (≈28% da largura):**
- Foto circular grande (160px) com botão de câmera `📷` sobreposto no canto
- Nome completo em negrito, tamanho grande
- Subtexto: gênero + " · " + idade + " anos"
- Telefone principal + " · " + CPF
- Badge tipo: "**Paciente**" (pill roxo claro)
- Botão verde "**Enviar mensagem**" (ícone WhatsApp branco) — abre a conversa WhatsApp existente
- Três botões menores em linha: "**Editar informações**" (outline) + ícone lixeira vermelho + ícone WhatsApp verde

**Contador de engajamento** (3 números em linha):
- **14** Agendamentos
- **1** Atendimentos
- **15** Compras

**Menu de navegação vertical** (lista de links):
- ─ Linha do tempo
- ○ Informações
- □ Saldo
- □ Pacotes
- $ Financeiro
- 📋 **Prontuário** ← ativo por padrão (fundo roxo, texto branco)
- □ Documentos
- □ Formulários

**Coluna direita (≈72% da largura):**
Exibe o conteúdo da seção ativa. Ver detalhes por seção abaixo.

**Novas colunas em `pacientes`:**
```sql
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS nacionalidade text,
  ADD COLUMN IF NOT EXISTS tipo_sanguineo text,
  ADD COLUMN IF NOT EXISTS condicoes_preexistentes text[],
  ADD COLUMN IF NOT EXISTS medicamentos_uso text[],
  ADD COLUMN IF NOT EXISTS fitzpatrick int CHECK (fitzpatrick BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_parentesco text,
  ADD COLUMN IF NOT EXISTS saldo numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS como_conheceu text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_cpf text;
```

---

## 📋 MÓDULO 3 — PRONTUÁRIO / ATENDIMENTO

> Esta é a seção mais complexa do sistema. Acessada via `/contatos/:id/prontuario` ou ao clicar "Iniciar atendimento" na agenda.

### 3.1 Layout do Prontuário

**Coluna esquerda (lista de fichas do atendimento):**
- Botão roxo "**Transcrição com IA**" no topo (com ponto vermelho ● quando gravando)
- Lista de fichas disponíveis para aquele atendimento (carregadas de `sessoes_tratamento` vinculadas):
  - 01. Anamnese
  - 02. Injetáveis Facial
  - 03. Injetáveis Corporal
  - 04. Capilar
  - 05. Harmonização
  - 06. Evolução
  - 07. Orçamento
  - 08. Plano de tratamento
  - 09. Prescrição Memed
  - 10. Pediatria
  - 11. Análise facial com IA
  - 12. Atendimento Psicopedagogia
  - 13. Atestado
  - 14. Avaliação facial
  - 15. Formulário Facial
  - 16. Odontograma
  - 17. Prescrição
  - 18. Registro fotográfico
  - CID-11 (com bolinha azul quando preenchido)
  - Formato de sobrancelha
  - Planejamento de Tratamento
  - (e demais fichas cadastradas pela clínica)
- Ficha ativa destacada em roxo
- Timer no rodapé esquerdo (ex: "⏱ 00:00:05")
- Botões rodapé: "**Rascunho salvo**" (com ícone de check) | "**Cancelar**" | "**Finalizar atendimento**" (roxo)

**Coluna direita (conteúdo da ficha ativa):**
Área de exibição e edição da ficha selecionada.

**Header do atendimento** (acima das fichas):
- Breadcrumb (apenas na visualização em prontuário fora do atendimento): "Contatos / Listagem / Paciente / Prontuário"
- Botão "✨ **Pedir à Anna**" (roxo, assistente IA, canto superior direito)
- Linha de atendimento: data + horário de início e fim + foto + nome do profissional + chevron para expandir/colapsar

**Botões de ação (acima do conteúdo da ficha, no prontuário histórico):**
- "**+ Adicionar filtro**" (botão roxo)
- "**✨ Adicionar nota**" (botão amarelo/laranja)
- "**× Recolher todos**" (link)

### 3.2 Builder de Fichas de Atendimento (ultra-personalizável)

> Nova tela em `/configuracoes/fichas` com drag-and-drop usando `@dnd-kit`.

**Layout:**
- Sidebar esquerda: paleta de componentes disponíveis para arrastar:
  - Seleção única (radio)
  - Seleção múltipla (checkbox)
  - Seleção de imagem (imagem clicável)
  - Data
  - Editor de texto (rich text)
  - Envio de arquivos (upload de até 10 arquivos/documentos)
  - Envio de imagens
  - Lista única (dropdown)
  - Lista múltipla (multi-select)
  - Número
  - Texto (input simples)
  - Rótulo (label decorativo)
  - Texto longo (textarea)
  - Injetáveis (mapa facial SVG interativo)
  - CID-11 (seletor de código CID)
  - Atestado (template de atestado)
  - Cálculo de IMC
  - Análise facial com IA
  - Cicatrizes de acne
  - Escala de Fitzpatrick (6 retângulos de cor: tipo 1 a 6)
  - Odontograma
  - Prescrição
- Área central: canvas de drop com borda pontilhada
  - Nome da ficha no topo (input editável)
  - Toggle "Ativo" + toggle "Formulário de pré-atendimento"
  - Componentes arrastados aparecem com borda pontilhada roxa quando selecionados
  - Cada componente tem ações ao hover: ✏️ Editar | □ Duplicar
- Ao arrastar um componente do tipo "Editor de texto" para o canvas, ele aparece com toolbar IA (`✨ IA ▾`) que expande em: Resumir, Extender, Reescrever, Simplificar, Corrigir ortografia

**Tabela `fichas_templates`:**
```sql
CREATE TABLE IF NOT EXISTS fichas_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  formulario_pre_atendimento boolean DEFAULT false,
  campos jsonb NOT NULL DEFAULT '[]',
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### 3.3 Transcrição com IA

> Acessado pelo botão "Transcrição com IA" na lateral esquerda do prontuário.

**Tela de Transcrição:**
- Cabeçalho: "**Transcrição com IA**" + badge "✨ CliniAI BETA"
- Descrição: "Torne o seu atendimento mais eficiente e completo..."
- 3 passos numerados (1, 2, 3):
  1. Peça permissão ao paciente antes de começar a gravação
  2. Inicie a gravação e a IA começará a transcrever o áudio
  3. Ao finalizar a gravação, um resumo do atendimento será gerado automaticamente
- Alerta informativo (borda azul lateral): aviso sobre necessidade de conexão estável
- Botão "**Iniciar gravação**" (gradiente roxo-rosa, ícone microfone)
- Durante gravação:
  - Botão vira círculo vermelho com ícone pause ⏸
  - Timer "00:00:03 / 01:00:00"
  - Visualizador de forma de onda (wavesurfer.js) — barras verticais animadas
  - Área direita: transcrição em tempo real aparecendo com label "**Profissional:**" e "**Paciente:**" em cores diferentes
  - Mensagem "Continue falando e veja a transcrição da gravação aqui! Pode haver um atraso de 5 à 60 segundos..."
- Após gravação finalizada: 2 tabs — "**Resumo**" | "**Transcrição**"
  - Resumo: texto gerado pelo GPT-4o sumarizando o atendimento
  - Transcrição: diálogo completo com separação Paciente/Profissional

**Implementação técnica:**
- Frontend: `MediaRecorder` API grava em chunks de 30 segundos
- Backend (`whatsapp-server.js`): nova rota `POST /api/ia/transcricao` que recebe o chunk de áudio, envia para Whisper API (OpenAI), retorna texto
- Separação de vozes: usar `diarization` ou heurística de pausa para identificar trocas de turno (Paciente vs Profissional)
- Ao finalizar: enviar transcrição completa para GPT-4o com prompt para gerar resumo clínico

**Nova tabela `transcricoes_ia`:**
```sql
CREATE TABLE IF NOT EXISTS transcricoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  sessao_id uuid REFERENCES sessoes_tratamento(id),
  paciente_id uuid REFERENCES pacientes(id),
  duracao_segundos int,
  transcricao_raw jsonb,  -- array de {speaker, texto, timestamp}
  resumo text,
  created_at timestamptz DEFAULT now()
);
```

### 3.4 Mapeamento de Injetáveis (SVG Interativo)

> Componente de ficha que exibe SVG de rosto frontal com pontos de aplicação clicáveis.

**Layout:**
- Painel esquerdo: legenda com tipos de injetável, cada um com bolinha colorida:
  - 🟣 Toxina Botulínica
  - 🟢 Fio de PDO
  - 🔴 Preenchimento
  - 🟡 Injetável (genérico)
  - (+ botão para adicionar tipos)
- Ao clicar em um tipo, ele fica "ativo" (fundo roxo no botão)
- Toggle "**Exibir quantidades**" no painel esquerdo
- Painel central: SVG de rosto feminino neutro (vista frontal) com pontos predefinidos:
  - Região frontal (linhas de expressão), glabela, arco superciliar, região periorbitária, zigomático, nasogeniano, bigode chinês, lábios superior e inferior, mento, linha da mandíbula, pescoço
  - Pontos clicáveis: ao clicar, aparece um popover com campo numérico + botão de confirmar ✓ + botão de remover –
  - Ponto com valor preenchido mostra badge com quantidade (ex: "5 un", "0.5 un")
  - Linhas direcionais com seta (laranja) indicam direção de aplicação
  - Botão fullscreen no canto superior direito do SVG
  - Botão de modo "arrastar" (ícone de mão) para navegar no SVG ampliado
- A foto do paciente pode ser usada como base do SVG (upload de imagem frontal + overlay do SVG por cima)
- Ao usar foto real: o SVG de pontos fica sobreposto com transparência
- Dados salvos em `prontuarios_clinicos.conteudo` tipo jsonb com estrutura:
  ```json
  {
    "tipo": "injetaveis",
    "pontos": [{"id": "glabela", "tipo": "toxina_botulinica", "valor": 5, "unidade": "un"}],
    "foto_base_url": "...",
    "exibir_quantidades": true
  }
  ```

**Nova tabela `mapeamentos_injetaveis`:**
```sql
CREATE TABLE IF NOT EXISTS mapeamentos_injetaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  sessao_id uuid REFERENCES sessoes_tratamento(id),
  paciente_id uuid REFERENCES pacientes(id),
  pontos jsonb NOT NULL DEFAULT '[]',
  foto_base_url text,
  relatorio text,
  data_diluicao date,
  volume_diluicao text,
  marca text,
  numero_lote text,
  created_at timestamptz DEFAULT now()
);
```

### 3.5 Análise Facial com IA

> Ficha "11. Análise facial com IA" no prontuário. Upload de foto frontal → análise via GPT-4o Vision.

**Fluxo:**
1. Upload de foto frontal do paciente (drag-and-drop ou captura de câmera)
2. Envio para `POST /api/ia/analise-facial` no backend
3. GPT-4o Vision analisa e retorna scores JSON para cada parâmetro
4. Exibição dos resultados em cards com scores de 0–100

**Parâmetros analisados (cards com barra de progresso):**
- Saúde da pele (0-100)
- Tom de olhos
- Tom da pele
- Idade estimada dos olhos
- Simetria facial
- Hidratação estimada
- Textura da pele
- Manchas / hiperpigmentação
- Olheiras
- Linhas de expressão

**Layout do resultado:**
- Foto enviada à esquerda
- Grid de cards à direita, cada card: ícone + parâmetro + score + barra colorida (vermelho→amarelo→verde)

**Nova tabela `analises_faciais`:**
```sql
CREATE TABLE IF NOT EXISTS analises_faciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  paciente_id uuid REFERENCES pacientes(id),
  sessao_id uuid REFERENCES sessoes_tratamento(id),
  foto_url text NOT NULL,
  resultados jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### 3.6 Comparativo Antes/Depois

> Componente na seção "Registro fotográfico" e no prontuário.

- Componente `ReactCompareSlider` (biblioteca `react-compare-slider` já instalada)
- Label "**Antes**" no canto superior esquerdo, "**Depois**" no canto superior direito
- Linha central divisória arrastável
- Opções de visualização: "**Imagens lado a lado**" | "**Imagens sobrepostas**"
- Botão "**Comparar**" na ficha (abre dropdown com "Comparar atendimentos" / "Imagens lado a lado" / "Imagens sobrepostas")
- Botão "**Adicionar nota**" e "**Imprimir**"

### 3.7 Upload via QR Code

> Em "Registro fotográfico" e "Envio de exames".

- Botão "Enviar via QR Code"
- Gera QR code usando `react-qr-code`
- QR aponta para URL temporária (token de 1h) que abre uma página mobile simplificada
- Página mobile: botão de câmera nativo + galeria → upload direto para Supabase Storage bucket `clinica`
- Ao fazer upload, webhook notifica o frontend via Supabase Realtime → imagem aparece na tela em tempo real
- Seção "Envio de exames": suporta PDF, DOC, DOCX, XLS, XLSX, CSV (até 20.97 MB)
- Seção "Envio de imagens": suporta JPG, JPEG, PNG, WEBP, HEIC, HEIF, JFIF (até 20.97 MB)

### 3.8 CID-11

> Ficha "CID-11" no prontuário. Seletor hierárquico de códigos.

**Layout:**
- Botão "Informar CID" abre modal/drawer
- Modal tem campo de busca no topo
- Navegação por capítulos (01–26):
  - 01 – Algumas doenças infecciosas ou parasitárias
  - 02 – Neoplasias
  - 03 – Doenças do sangue ou dos órgãos formadores do sangue
  - ... (todos os 26 capítulos)
- Ao selecionar um capítulo, lista subcategorias; ao selecionar subcategoria, lista códigos específicos
- Código selecionado aparece como chip roxo na ficha

### 3.9 Atestado / Prescrição

> Fichas "13. Atestado" e "17. Prescrição" no prontuário.

**Atestado:**
- Dropdown "Modelo" (ex: "Atestado de Comparecimento") + campo "Data"
- Editor rich text (TipTap) com toolbar completa: IA ▾ | Tamanho | — | + | B | I | U | S | alinhamentos | listas | variáveis `{}` | desfazer | refazer | fullscreen
- Texto pré-preenchido com variáveis do paciente (`{{nome_paciente}}`, `{{rg}}`, `{{data}}`, etc.)
- Linha de assinatura com nome do profissional e registro
- Link "+ Adicionar página"

**Prescrição:**
- Estrutura similar ao atestado com campos específicos de medicamento, dosagem, posologia

### 3.10 Odontograma

> Ficha "16. Odontograma". Específica para dentistas/odontologistas.

**Layout:**
- Tabs: "**Permanentes**" (padrão, fundo roxo) | "**Decíduos**"
- Grid de dentes: linha superior (18, 17, 16... 11, 21... 28) + linha inferior (48, 47... 41, 31... 38)
- Cada dente: ícone SVG de dente (2 partes: raiz + coroa). Dentes selecionados ficam roxo.
- Ao clicar: seleciona o dente e mostra chips de anotação no rodapé: "15 (V, D, P, M, O)" + botão × por dente
- Letras V (vestibular), D (distal), P (palatino/lingual), M (mesial), O (oclusal)

### 3.11 Linha do Tempo do Paciente

> Seção "Linha do tempo" no perfil do paciente.

- Feed cronológico reverso de eventos do paciente:
  - Agendamentos criados/cancelados
  - Atendimentos realizados
  - Compras
  - Mensagens enviadas
  - Documentos assinados
  - Alterações de dados
- Cada evento: ícone colorido + descrição + data/hora + quem fez a ação

---

## 💰 MÓDULO 4 — FINANCEIRO

> **Módulo completamente novo.** O projeto ainda não tem financeiro. Criar do zero.

### 4.1 Menu Flyout (sidebar)

Ao clicar no ícone Financeiro na sidebar, abre flyout com:
- **Visão geral** (selecionado por padrão, roxo)
- Contas a receber
- Contas a pagar
- Extrato de movimentações
- Relatório de competência
- Fluxo de caixa diário
- Fluxo de caixa mensal
- Relatório de categorias
- DRE
- Histórico de fechamentos
- Contas financeiras
- Categorias de contas
- Métodos de pagamento
- Integração maquininha (badge "stone" em verde)

### 4.2 Visão Geral Financeiro

**Filtros** (accordion no topo):
- Label "**Filtros**" + contador "2 filtros aplicados" + link "Limpar filtros"
- Chips de filtro ativo (ex: "Período: Jan 2025") com × para remover

**4 KPI cards** em linha:
| Card | Ícone | Valor | Variação |
|------|-------|-------|----------|
| Receitas | gráfico verde | R$ 18.340,00 | ↑ 35,1% verde |
| Despesas | gráfico vermelho | R$ 1.530,20 | ↓ -12,4% vermelho |
| A pagar | — | R$ 230,00 | Previsto: R$ 230,00 |
| A receber | — | R$ 650,00 | Previsto: R$ 1.300,00 |

- Receitas e Despesas: ícone de gráfico circular (donut) com cor correspondente
- Abaixo de cada valor: "Previsto: R$ X"

**Gráfico "Fluxo de caixa":**
- Recharts `ComposedChart` (barras + linhas sobrepostas)
- Seletor Diária | Semanal | Mensal | Anual
- Eixo X: datas (dias/semanas/meses)
- Barras verdes: Entradas reais
- Barras verde-claro: Entradas previstas
- Barras vermelhas: Saídas reais
- Barras rosa: Saídas previstas
- Linha azul sólida: Saldo real
- Linha azul tracejada: Saldo previsto
- Tooltip ao hover: mostra todos os valores do ponto
- Legenda embaixo do gráfico

**Painel direito — Contas financeiras:**
- Título "**Contas financeiras**" + link "Ver todas"
- Lista de contas: ícone colorido da instituição + nome da conta + tipo + saldo
  - Ex: Stone (verde) | Caixa Econômica Federal (azul) | Banco do Brasil (amarelo) | Nubank (roxo) | SumUp (preto) | Caixa geral (azul claro)
- Rodapé: "**Saldo total:** R$ 60.100,00" em negrito

**Seção inferior (2 colunas):**
- **A receber** (esquerda) + link "Ver todas":
  - Inadimplência — valor vermelho
  - Para hoje — valor
  - Para este mês — valor
  - Para este ano — valor
  - Recebidos no mês — valor
- **A pagar** (direita) + link "Ver todas":
  - Em atraso — valor vermelho
  - Para hoje — valor
  - Para este mês — valor
  - Para este ano — valor
  - Pagos no mês — valor
- **Categorias** (direita abaixo das contas): toggle "Receita" | "Despesa" + gráfico pizza (Recharts PieChart)

### 4.3 Novas Tabelas Financeiro

```sql
CREATE TABLE IF NOT EXISTS contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  tipo text NOT NULL, -- caixa, conta_corrente, conta_digital, conta_recebimento, cofre
  instituicao text,
  cor text,
  saldo_inicial numeric(10,2) DEFAULT 0,
  saldo_atual numeric(10,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  cor text,
  icone text,
  parent_id uuid REFERENCES categorias_financeiras(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metodos_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL, -- dinheiro, pix, cartao_credito, cartao_debito, transferencia, boleto, convenio
  ativo boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao text NOT NULL,
  valor numeric(10,2) NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'inadimplente')),
  categoria_id uuid REFERENCES categorias_financeiras(id),
  conta_id uuid REFERENCES contas_financeiras(id),
  metodo_pagamento_id uuid REFERENCES metodos_pagamento(id),
  paciente_id uuid REFERENCES pacientes(id),
  agendamento_id uuid REFERENCES agendamentos_clinica(id),
  comanda_id uuid,
  parcelas int DEFAULT 1,
  parcela_atual int DEFAULT 1,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  paciente_id uuid REFERENCES pacientes(id),
  agendamento_id uuid REFERENCES agendamentos_clinica(id),
  status text DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  itens jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(10,2),
  desconto numeric(10,2) DEFAULT 0,
  total numeric(10,2),
  created_at timestamptz DEFAULT now()
);
```

---

## 🛒 MÓDULO 5 — VENDAS

> **Módulo novo.** Acessado via ícone de carrinho na sidebar.

### 5.1 Menu Flyout

- **Visão geral** (ativo, roxo)
- Relatório de vendas
- Relatório de pacotes
- Relatório de saldos
- Orçamentos
- Notas fiscais

### 5.2 Visão Geral de Vendas

**4 KPI cards:**
| Card | Valor | Variação |
|------|-------|----------|
| Faturamento | R$ 56.719,00 | ↓ -9,52% vermelho |
| Vendas | 86 | ↑ 21,13% verde |
| Valor orçado | R$ 7.075,00 | ↓ -34,19% vermelho |
| Ticket médio | R$ 659,52 | ↓ -25,31% vermelho |

**Gráfico "Faturamento × Vendas":**
- Recharts `ComposedChart` com 3 linhas:
  - Linha azul: Faturamento
  - Linha verde: Vendas
  - Linha roxa: Orçado
- Seletor de período: **Diária** | Semanal | Mensal | Anual (tabs underline)
- Eixo X: datas
- Legenda embaixo

**Painel direito — Orçamentos:**
- Título "**Orçamentos**" + link "Ver todos"
- 3 linhas de status:
  - 🟡 **Em aberto** 3 · R$ 2.480,00
  - 🔴 **Perdido** 0 · -R$ 0,00
  - 🟢 **Ganho** 1 · R$ 100,00

**Painel "Vendas por tipo":**
- Barra horizontal proporcional (ex: 95,55% Procedimentos + 4,45% Produtos)
- Legenda: 🟡 Procedimentos · 🩷 Produtos

**3 Rankings lado a lado:**
Cada ranking: header com ícone colorido + título + link "ver mais" + lista numerada

| Ranking de Procedimentos | Ranking de Produtos | Ranking de Pacientes |
|--------------------------|---------------------|----------------------|
| 1 🥇 Avaliação facial — 20 · R$ 900,00 | 1 🥇 Hidratante facial — 11 · R$ 880,00 | 1 🥇 Ana Luiza — 13 · R$ 6.430,00 |
| 2 🥈 Corrente russa — 16 · R$ 3.000,00 | 2 🥈 Esfoliante — 6 · R$ 420,00 | 2 🥈 Amanda Silva — 13 · R$ 5.349,00 |
| 3 🥉 Carboxiterapia — 16 · R$ 3.200,00 | 3 🥉 Óleo para massagem — 5 · R$ 400,00 | 3 🥉 Marcia Santos — 11 · R$ 8.315,00 |

- Posição 1: círculo amarelo ouro + ícone estrela amarelo
- Posição 2: círculo cinza prateado + ícone estrela cinza
- Posição 3: círculo laranja-bronze + ícone estrela laranja

---

## 🎯 MÓDULO 6 — CRM / OPORTUNIDADES

> **Já existe CRM básico. Expandir para Kanban completo.**

### 6.1 Dashboard CRM

**Filtros:** accordion com filtro de funil ("Funil: Funil Padrão" + chip) + "+ Adicionar filtro"

**4 KPI cards:**
- Criadas: 34 (R$ 7.386,00) | ↑ 0%
- Em andamento: 16 (R$ 1.906,00) | ↑ 0%
- Ganhas: 17 (R$ 4.980,00) | ↑ 0%
- Perdidas: 1 (R$ 500,00) | ↑ 0%

**Gráfico funil "Oportunidades por etapa":**
- Barras horizontais em degradê de roxo (mais escuro no topo → mais claro embaixo)
- Cada barra: nome da etapa (esquerda) + "N • X%" (direita)
  - Entrada: 33 • 100%
  - Contatado: 30 • 91%
  - Orçado: 26 • 79%
  - Agendado: 22 • 67%
  - Ganho: 17 • 52%
- Painel direito: Leads: 4 | Conversão: 50%

**Gráfico "Origem":**
- Recharts `BarChart` vertical
- Barras roxas com quantidade
- Eixo X: Indicação | Instagram | Google | Facebook | E-mail

**Seção "Ranking de Vendedores":**
- Lista numerada com foto + nome + qtd vendas + valor

### 6.2 Board Kanban (Oportunidades)

URL: `/crm/oportunidades`

**Header:** "**Oportunidades**" + total (R$ 3.606,00 · 12 registros) + ícone filtro + ícone configuração

**Colunas Kanban** (react-beautiful-dnd, já instalado):
- Entrada | Contatado | Orçado | Agendado | Ganho | Perdido
- Cada coluna: header com nome + valor total (R$) + "N oportunidades"
- Cards de oportunidade:
  - Título (ex: "Oportunidade de Bianca")
  - Valor (ex: R$ 500,00)
  - Nome do paciente em roxo (link)
  - Data (ex: "hoje" ou "ter, 13/08/2024")
  - Avatar do responsável (canto inferior direito)
  - Ícone de status (⊙ pendente, ✓ ganho)
- Cards são arrastáveis entre colunas (DnD)
- Botão `+` roxo flutuante para nova oportunidade
- Ao clicar no card: abre painel lateral com detalhes

**Novas tabelas:**
```sql
CREATE TABLE IF NOT EXISTS crm_funis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL DEFAULT 'Funil Padrão',
  ativo boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  funil_id uuid REFERENCES crm_funis(id),
  nome text NOT NULL,
  ordem int NOT NULL,
  cor text
);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  titulo text NOT NULL,
  paciente_id uuid REFERENCES pacientes(id),
  etapa_id uuid REFERENCES crm_etapas(id),
  responsavel_id uuid REFERENCES profissionais_clinica(id),
  valor numeric(10,2),
  data_fechamento date,
  origem text,
  status text DEFAULT 'aberta' CHECK (status IN ('aberta', 'ganha', 'perdida')),
  observacoes text,
  created_at timestamptz DEFAULT now()
);
```

---

## 📦 MÓDULO 7 — ESTOQUE

> **Módulo completamente novo.**

### 7.1 Menu Flyout

- **Controle de estoque** (ativo, roxo)
- Lotes e validades
- Giro de estoque
- Contagem de estoque
- Itens abertos
- Compras
- Marcas

### 7.2 Controle de Estoque

**Header:** "**Controle de estoque**" + "181 registros" + "Ações em lote ▾" + "Exportar ▾"

**Filtros rápidos** (3 chips clicáveis):
- 🔴 **Estoque baixo** 51
- 🟡 **Estoque alto** 8
- 🔵 **Todos** 181 (ativo, underline azul)

**Barra de busca** + "+ Adicionar filtro"

**Tabela com colunas:**
| ☐ | Item | Categoria | Disponível | Custo médio | Preço | Ativo | ⚙️ |
|---|------|-----------|-----------|-------------|-------|-------|----|
| ☐ | 📦 Ácido hialurônico – facil · ACID01 | 🟣 Padrão | 11 itens | R$ 10,00 | R$ 99,00 | ● | ⋮ |

- Coluna Item: ícone de cubo roxo + nome em negrito + código SKU em cinza abaixo
- Coluna Categoria: chip colorido com nome
- Colunas Custo médio e Preço: com ícone de ajuda `?`
- Coluna Ativo: toggle switch
- Seleção de quantidade por página: "25 por página ▾"

### 7.3 Novas Tabelas Estoque

```sql
CREATE TABLE IF NOT EXISTS estoque_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  cor text
);

CREATE TABLE IF NOT EXISTS estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  sku text,
  categoria_id uuid REFERENCES estoque_categorias(id),
  unidade text DEFAULT 'un',
  custo_medio numeric(10,2) DEFAULT 0,
  preco_venda numeric(10,2) DEFAULT 0,
  estoque_minimo int DEFAULT 0,
  estoque_maximo int,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  item_id uuid REFERENCES estoque_itens(id),
  numero_lote text,
  data_fabricacao date,
  data_validade date,
  quantidade int NOT NULL DEFAULT 0,
  custo_unitario numeric(10,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  item_id uuid REFERENCES estoque_itens(id),
  lote_id uuid REFERENCES estoque_lotes(id),
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia')),
  quantidade int NOT NULL,
  custo_unitario numeric(10,2),
  motivo text,
  referencia_id uuid,
  referencia_tipo text,
  created_at timestamptz DEFAULT now()
);
```

---

## 💸 MÓDULO 8 — COMISSÕES

> **Módulo novo com tabela matricial.**

### 8.1 Tabela de Comissões

**Layout:**
- Header: "**Tabela de comissões de atendimentos**" + campo de busca "Buscar"
- Tabela matricial:
  - **Coluna "Padrão"**: % padrão de comissão geral
  - **Colunas por profissional**: foto circular + nome no header. Cada célula editável inline com valor % ou R$
  - **Linhas por procedimento**: código + nome abreviado do procedimento
  - Células mostram % ou R$ dependendo do tipo de comissão configurado por profissional

**Modal "Finalizar comissões":**
- Header: Profissional (foto + nome) | Período (datas) | A comissionar (valor total)
- Seção "**Vendas realizadas**":
  - Tabela com checkbox de seleção por linha
  - Colunas: ☐ | Descrição | Valor | Comissão (input editável com dropdown R$/%) | Taxa (R$) | Custo adc. (R$) | À receber (verde)
  - Rodapé: total geral

### 8.2 Novas Tabelas Comissões

```sql
CREATE TABLE IF NOT EXISTS comissoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  profissional_id uuid REFERENCES profissionais_clinica(id),
  procedimento_id uuid REFERENCES procedimentos(id),
  tipo text DEFAULT 'percentual' CHECK (tipo IN ('percentual', 'fixo')),
  valor numeric(10,2) DEFAULT 0,
  -- NULL profissional_id = regra padrão para todos
  UNIQUE (admin_profile_id, profissional_id, procedimento_id)
);

CREATE TABLE IF NOT EXISTS comissoes_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  profissional_id uuid NOT NULL REFERENCES profissionais_clinica(id),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_total numeric(10,2),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  itens jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
```

---

## 🏥 MÓDULO 9 — ATENDIMENTOS (lista global)

> **Expansão do que existe.** A lista de atendimentos já existe. Expandir com submenu e melhorar a tabela.

### 9.1 Menu Flyout

Ao clicar no ícone de Atendimentos (estetoscópio) na sidebar:
- **Listagem** (ativo, roxo)
- Atestados e prescrições
- Guias SP/SADT
- Atendimentos por CID

### 9.2 Listagem de Atendimentos

**Header:** "**Listagem de atendimentos**" + "551 registros" + "Exportar ▾"

**Filtros:** "+ Adicionar filtro"

**Tabela com colunas (virtualizadas):**
| Data | Paciente | Profissional | Modelo(s) de atendimento | Status | ⋮ |
|------|----------|--------------|--------------------------|--------|---|
| 27/04/2025 | Marcos Silva | Mariana Silva | 13. Atestado, 14. Avaliação f... | 🟢 **Finalizado** | ⋮ |
| 25/04/2025 | Amanda Silva | Mariana Silva | 02. Injetáveis Facial, Tipos... | 🟣 **Finalizado automaticamente** | ⋮ |

- Status "**Finalizado**": chip verde claro com texto verde escuro
- Status "**Finalizado automaticamente**": chip roxo claro com texto roxo
- Coluna "Modelo(s)" mostra lista abreviada com "..." se muitos

### 9.3 Atendimentos por CID

**Header:** "**Atendimentos por CID**" + "5 registros" + "Exportar ▾"
**Tabela:**
| Data | Paciente | Código CID | ⋮ |
|------|----------|-----------|---|
| 14/03/2025 | 🔵 ALINE | 4A44.2 Cefaleia devida à arterite de células gigan... | ⋮ |
| 14/03/2025 | 🔵 Isabella Lima | MB4D Cefaleia, não classificada em outra parte | ⋮ |

---

## 📣 MÓDULO 10 — AUTOCHAT (Mensagens Automáticas)

> **Módulo novo.** Configuração em `/autochat` ou `/configuracoes/mensagens`.

### 10.1 Modelos de Mensagem do Sistema

Grid de cards 4×N, cada card:
- Ícone roxo centralizado
- Título em negrito
- Descrição em cinza
- Chips de canal: **WhatsApp** (verde) | **SMS** (cinza) | **E-mail** (cinza)
- Botão "**Personalizar**" (roxo, largura total)

**8 modelos de sistema (primeira linha visível):**
1. **Aniversário** — "Programe o envio de uma mensagem de felicitações no aniversário dos seus pacientes..."
2. **Boas-vindas** — "Envie uma mensagem recepcionando os pacientes após a realização do cadastro..."
3. **Lembrete de retorno** — "Aumente a taxa de retorno enviando um lembrete de reconsulta de acordo com o intervalo entre sessões..."
4. **Lembrete de agendamento** — "Ajude seus clientes a lembrarem da consulta enviando um lembrete automático..."
5. **Agendamento criado** — "Notifique seu paciente assim que um agendamento for criado..."
6. **Agendamento alterado** — "Notifique os pacientes quando um agendamento tiver data, hora, duração ou profissional alterados..."
7. **Confirmação de agendamento** — "Programe o envio de link de confirmação para pacientes que possuem agendamentos com status 'Agendado'..."
8. **Agendamento confirmado** — "Notifique automaticamente os pacientes quando o status do agendamento for alterado para 'Confirmado'..."

**Ao clicar "Personalizar":**
- Modal com editor de mensagem
- Variáveis disponíveis: {{nome_paciente}}, {{data_agendamento}}, {{hora}}, {{profissional}}, {{procedimento}}, etc.
- Seleção de canal de envio
- Toggle ativo/inativo
- Preview da mensagem

**Novas tabelas:**
```sql
CREATE TABLE IF NOT EXISTS autochat_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  tipo text NOT NULL, -- aniversario, boas_vindas, lembrete_retorno, lembrete_agendamento, etc.
  canal text[] DEFAULT '{whatsapp}',
  mensagem_whatsapp text,
  mensagem_sms text,
  mensagem_email text,
  ativo boolean DEFAULT false,
  antecedencia_horas int, -- para lembretes
  created_at timestamptz DEFAULT now()
);
```

---

## 📝 MÓDULO 11 — AUTODOCS (Assinatura Digital)

> **Módulo novo.**

### 11.1 Visualização de Documento

**Layout:**
- Breadcrumb: "Contatos / Listagem / Paciente / Documentos"
- Coluna esquerda: "**Lista de signatários**"
  - Cada signatário: avatar + nome + badge tipo ("Paciente", "Profissional")
  - Ícone de status (ícone de carregamento = aguardando)
  - Menu ⋮ por signatário
  - Link "+ Adicionar signatário"
  - Botão "**Enviar para assinatura**" roxo (com seta dropdown ▸)
- Coluna direita: preview do documento
  - Barra lateral com ícones de ferramentas (PDF, cursor, etc.)
  - Documento renderizado (react-pdf)

### 11.2 Modal "Enviar para assinatura"

- Título "**Enviar documento**"
- Opções de envio (radio):
  - ✅ Via e-mail
  - ○ Via SMS
  - ○ Via WhatsApp (em breve — desabilitado)
- Autenticação (radio):
  - ✅ Token via e-mail
  - ○ Token via SMS (em breve — desabilitado)
  - ○ Token via WhatsApp (em breve — desabilitado)
  - ○ Sem autenticação
- Autenticação adicional (checkbox):
  - ☐ Assinatura manuscrita
- Botão "**Avançar**" roxo

**Nova tabela:**
```sql
CREATE TABLE IF NOT EXISTS documentos_clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  titulo text NOT NULL,
  conteudo_html text,
  paciente_id uuid REFERENCES pacientes(id),
  signatarios jsonb DEFAULT '[]', -- [{id, nome, tipo, email, status, assinado_em}]
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'assinado', 'cancelado')),
  canal_envio text,
  tipo_autenticacao text,
  created_at timestamptz DEFAULT now()
);
```

---

## 📱 MÓDULO 12 — MARKETING

> **Módulo novo.** Integração com Canva para templates + IA para copy.

### 12.1 Página Inicial do Marketing

**Hero banner** (gradiente azul→roxo):
- Texto centralizado: "**O que você vai criar hoje?**"
- Campo de busca largo: "Pesquisar conteúdo" com ícone lupa
- Subtexto: "Impulsionado pelo **Canva**" (logo Canva)

**Seções de templates** (scroll horizontal, link "Ver tudo" à direita):
- **Estética** — cards de posts sobre estética/emagrecimento/procedimentos
- **Datas comemorativas** — cards de posts de aniversário, dia dos pais, etc.
- **Avisos** — cards de comunicados da clínica

Cada card de template:
- Imagem preview do post
- Ícone de engrenagem Canva (link para editar no Canva)
- Ao clicar: abre editor Canva embed ou link externo

**Funcionalidade IA:**
- Botão "**Gerar com IA**" → modal onde usuário descreve o post desejado
- IA (GPT-4o) gera: título + copy + hashtags + sugestão de horário de postagem
- Opcionalmente gera imagem (DALL-E 3) se solicitado

**Nova tabela:**
```sql
CREATE TABLE IF NOT EXISTS marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  titulo text,
  copy text,
  hashtags text[],
  imagem_url text,
  canva_design_id text,
  status text DEFAULT 'rascunho',
  agendado_para timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## 🌐 MÓDULO 13 — SITE DA CLÍNICA

> **Módulo novo.** Builder de página web pública para a clínica.

### 13.1 Site Público

**Layout do site publicado:**
- Hero: mosaico de fotos da clínica (grid 2×2 ou 1+3)
- Tabs de navegação: **Sobre nós** | Procedimentos | Profissionais | Horário de funcionamento
- Coluna principal (70%):
  - Logo circular + nome da clínica
  - Sobre nós: texto descritivo
  - Procedimentos: campo de busca + lista por categoria (accordion) com nome, duração e preço + botão "Agendar"
- Coluna lateral (30%):
  - Card com logo + nome
  - Status: "**Aberto** · Fecha às 18:00" (ou "Fechado")
  - Botão "**Compartilhar**" (outline)
  - Redes sociais: ícones clicáveis (Facebook, Instagram, TikTok, X/Twitter, LinkedIn, YouTube)
  - Botão "**Agendar**" (roxo, largura total)

**Status de procedimentos no site:**
- Badge "**A realizar**" (laranja) — quantidade de sessões programadas
- Badge "**A orçar**" (cinza) — aguardando orçamento
- Valor e botão "**Orçar**" (roxo outline)

**Nova tabela:**
```sql
CREATE TABLE IF NOT EXISTS site_clinica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text,
  descricao text,
  logo_url text,
  fotos_hero jsonb DEFAULT '[]',
  redes_sociais jsonb DEFAULT '{}',
  horario_funcionamento jsonb DEFAULT '{}',
  dominio_personalizado text,
  publicado boolean DEFAULT false,
  configuracoes jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
```

---

## ⚙️ MÓDULO 14 — INTEGRAÇÕES IA (Backend)

> Todas as rotas de IA são adicionadas ao final de `whatsapp-server.js` sem alterar a estrutura existente.

```javascript
// === ROTAS IA — adicionar ao final de whatsapp-server.js ===

import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Transcrição de áudio (Whisper)
app.post('/api/ia/transcricao', async (req, res) => {
  // Recebe arquivo de áudio em multipart/form-data
  // Envia para openai.audio.transcriptions.create com model: 'whisper-1'
  // Retorna { texto, duracao }
});

// Resumo clínico (GPT-4o)
app.post('/api/ia/resumo-atendimento', async (req, res) => {
  // Recebe { transcricao: string }
  // Envia para GPT-4o com prompt de resumo clínico
  // Retorna { resumo }
});

// Análise facial (GPT-4o Vision)
app.post('/api/ia/analise-facial', async (req, res) => {
  // Recebe { imagem_base64: string }
  // Envia para GPT-4o vision com prompt de análise facial
  // Retorna { resultados: { parametro, score, observacao }[] }
});

// Geração de copy de marketing (GPT-4o)
app.post('/api/ia/marketing-copy', async (req, res) => {
  // Recebe { descricao, tipo_post }
  // Retorna { titulo, copy, hashtags, sugestao_horario }
});

// Assistente clínico (GPT-4o) — botão "Pedir à Anna"
app.post('/api/ia/assistente', async (req, res) => {
  // Recebe { mensagem, contexto_paciente }
  // Retorna { resposta }
});
```

---

## 📊 PADRÕES DE COMPONENTES REUTILIZÁVEIS

### Padrão de Filtros Dinâmicos

Usado em todas as listagens (Contatos, Atendimentos, Estoque, etc.):
- Botão "+ **Adicionar filtro**" (ícone + roxo + texto roxo)
- Ao clicar: dropdown com lista de campos filtráveis
- Ao selecionar um campo: aparece chip de filtro com o valor + × para remover
- Link "**Limpar filtros**" (roxo) aparece à direita quando há filtros ativos
- Chips de filtro ativo aparecem inline: "Campo: Valor ×"

### Padrão de Tabela

Todas as tabelas do sistema seguem:
- Header: título + contador "N registros" + ações à direita
- Colunas com ícone `◆` para ordenação
- Ícone ⚙️ no final do header para configurar colunas visíveis
- Checkbox de seleção múltipla na primeira coluna
- Menu ⋮ na última coluna com ações contextuais
- Paginação: "25 por página ▾" + "< 1 >"
- Virtualização para listas > 100 registros

### Padrão de KPI Cards

- Fundo branco, borda arredondada, sombra leve
- Ícone decorativo (opcional)
- Título em cinza
- Valor principal em negrito grande
- Indicador de variação: ↑ ou ↓ + % em verde (positivo) ou vermelho (negativo)
- Subtexto "Previsto: R$ X" em cinza

### Padrão de Status Badge

| Status | Cor fundo | Cor texto |
|--------|-----------|-----------|
| Finalizado | verde claro | verde escuro |
| Finalizado automaticamente | roxo claro | roxo |
| Agendado | azul claro | azul |
| Confirmado | verde claro | verde |
| Cancelado | vermelho claro | vermelho |
| Não compareceu | laranja claro | laranja |
| Em atendimento | amarelo claro | amarelo escuro |
| Concluído | verde | branco |

---

## 🔗 FLUXOS CONECTADOS ENTRE MÓDULOS

```
AGENDA
  └── Clicar "Iniciar atendimento"
        └── Cria sessao_tratamento
        └── Navega para PRONTUÁRIO
              └── Lista fichas disponíveis para o atendimento
              └── Clicar "Transcrição com IA"
                    └── Grava → Whisper → GPT-4o resumo
              └── Clicar ficha "Injetáveis"
                    └── Abre mapeamento SVG facial
              └── Clicar ficha "Análise facial com IA"
                    └── Upload foto → GPT-4o Vision → scores
              └── Clicar "Finalizar atendimento"
                    └── Atualiza sessao_tratamento.status = 'concluido'
                    └── Oferece gerar Atestado / Prescrição

AGENDA
  └── Clicar "Finalizar comanda"
        └── Abre FINANCEIRO/comanda
              └── Lança em lancamentos

CONTATOS / PACIENTE
  └── Aba "Prontuário"
        └── Lista histórico de sessoes_tratamento
        └── Expandir sessão = ver fichas preenchidas
  └── Aba "Oportunidades do CRM"
        └── Kanban de crm_oportunidades filtrado por paciente
  └── Aba "Financeiro"
        └── lançamentos filtrados por paciente_id
  └── Aba "Pacotes"
        └── protocolos_pacotes vinculados ao paciente
  └. Aba "Documentos"
        └── documentos_clinica vinculados ao paciente

VENDAS
  └── Orçamentos → ao aceitar → cria agendamento

ESTOQUE
  └── Ao finalizar atendimento → debita materiais usados em estoque_movimentacoes

COMISSÕES
  └── Calculadas a partir de lancamentos onde profissional_id está presente
```

---

## 📋 MIGRATIONS SQL COMPLETAS

```sql
-- Executar em ordem no Supabase

-- 1. Salas de atendimento
CREATE TABLE IF NOT EXISTS salas_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE salas_atendimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON salas_atendimento USING (admin_profile_id = app_admin_profile_id());

-- 2. Convênios
CREATE TABLE IF NOT EXISTS convenios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  ativo boolean DEFAULT true
);
ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON convenios USING (admin_profile_id = app_admin_profile_id());

-- 3. Expand agendamentos_clinica
ALTER TABLE agendamentos_clinica
  ADD COLUMN IF NOT EXISTS teleconsulta boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recorrencia jsonb,
  ADD COLUMN IF NOT EXISTS formulario_pre_id uuid,
  ADD COLUMN IF NOT EXISTS comanda_id uuid,
  ADD COLUMN IF NOT EXISTS sala_id uuid,
  ADD COLUMN IF NOT EXISTS convenio_id uuid;

-- 4. Expand pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS nacionalidade text,
  ADD COLUMN IF NOT EXISTS tipo_sanguineo text,
  ADD COLUMN IF NOT EXISTS condicoes_preexistentes text[],
  ADD COLUMN IF NOT EXISTS medicamentos_uso text[],
  ADD COLUMN IF NOT EXISTS fitzpatrick int,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_parentesco text,
  ADD COLUMN IF NOT EXISTS saldo numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS como_conheceu text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_cpf text;

-- 5. Fichas templates
CREATE TABLE IF NOT EXISTS fichas_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  formulario_pre_atendimento boolean DEFAULT false,
  campos jsonb NOT NULL DEFAULT '[]',
  ordem int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE fichas_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON fichas_templates USING (admin_profile_id = app_admin_profile_id());

-- 6. Transcrições IA
CREATE TABLE IF NOT EXISTS transcricoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  sessao_id uuid REFERENCES sessoes_tratamento(id),
  paciente_id uuid REFERENCES pacientes(id),
  duracao_segundos int,
  transcricao_raw jsonb,
  resumo text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transcricoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON transcricoes_ia USING (admin_profile_id = app_admin_profile_id());

-- 7. Mapeamentos injetáveis
CREATE TABLE IF NOT EXISTS mapeamentos_injetaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  sessao_id uuid REFERENCES sessoes_tratamento(id),
  paciente_id uuid REFERENCES pacientes(id),
  pontos jsonb NOT NULL DEFAULT '[]',
  foto_base_url text,
  relatorio text,
  data_diluicao date,
  volume_diluicao text,
  marca text,
  numero_lote text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE mapeamentos_injetaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON mapeamentos_injetaveis USING (admin_profile_id = app_admin_profile_id());

-- 8. Análises faciais
CREATE TABLE IF NOT EXISTS analises_faciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  paciente_id uuid REFERENCES pacientes(id),
  sessao_id uuid REFERENCES sessoes_tratamento(id),
  foto_url text NOT NULL,
  resultados jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE analises_faciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON analises_faciais USING (admin_profile_id = app_admin_profile_id());

-- 9. Financeiro (contas, categorias, métodos, lançamentos, comandas)
-- [ver definições completas nas seções acima]

-- 10. CRM (funis, etapas, oportunidades)
-- [ver definições completas nas seções acima]

-- 11. Estoque (categorias, itens, lotes, movimentações)
-- [ver definições completas nas seções acima]

-- 12. Comissões
-- [ver definições completas nas seções acima]

-- 13. AutoChat modelos
-- [ver definições completas nas seções acima]

-- 14. Documentos
-- [ver definições completas nas seções acima]

-- 15. Marketing
-- [ver definições completas nas seções acima]

-- 16. Site da clínica
-- [ver definições completas nas seções acima]
```

---

## 🎨 OBSERVAÇÕES FINAIS DE UX/UI

1. **Flyouts laterais de submenu**: todos os módulos com submenu (Contatos, Atendimentos, Vendas, Financeiro, Estoque) seguem o mesmo padrão: ao clicar no ícone da sidebar, abre um painel animado com lista de subpáginas. O item ativo fica com fundo roxo + texto branco.

2. **Slide panels laterais**: ao abrir detalhes (evento de agenda, oportunidade CRM, etc.) → painel desliza da direita, NÃO modal central. Usa Framer Motion.

3. **Botão `+` flutuante roxo**: presente nas páginas de lista (CRM, Estoque, Contatos). Algumas páginas têm ele com dropdown de opções (igual à agenda).

4. **Breadcrumb**: todas as páginas de detalhe têm breadcrumb no topo esquerdo.

5. **Exportar**: todas as tabelas principais têm botão "**Exportar ▾**" com opções CSV/Excel (usando jspdf-autotable já instalado).

6. **Ações em lote**: tabelas com checkbox têm "**Ações em lote ▾**" que habilita quando há seleção.

7. **Paginação**: "25 por página ▾" + navegação `< 1 >` em todas as tabelas. Para listas > 100 itens, usar virtualização.

8. **Tempo real**: usar Supabase Realtime para atualizar automaticamente listas quando outros usuários fazem alterações (especialmente agenda e chat já existente).

9. **Loading states**: todos os componentes devem ter skeleton loading (seguindo o padrão já usado no projeto).

10. **Toast notifications**: usar Sonner (já instalado) para todos os feedbacks de ação (salvo, erro, copiado, etc.).


