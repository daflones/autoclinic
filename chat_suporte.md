Aqui está a análise clara e estruturada:

PROMPT — Sistema de Chat Suporte + IA
Visão Geral
Sistema de suporte em tempo real entre clínicas e administradores, com opção de ativar IA (OpenAI) para responder automaticamente em nome da administração.

Chat Flutuante — Lado da Clínica

Widget flutuante disponível em todas as páginas da clínica
Campos para abrir um chamado:

Assunto (ex: "Problema com instância")
Problema (categoria ou descrição curta)
Mensagem (texto livre)


Após abrir o chamado, a clínica continua enviando mensagens naquele ticket
Mensagens salvas no banco de dados em tempo real
A clínica vê as respostas da administração (ou da IA) no mesmo chat


Painel Admin — Gestão de Chamados

Lista de todas as clínicas que solicitaram atendimento
Indicador visual de chamados não lidos / aguardando resposta
Ao clicar em uma clínica → abre o chat completo em tempo real
Admin pode digitar e enviar mensagens diretamente para a clínica
Botão "Ativar IA" por chamado (ou global):

Quando ativado → OpenAI lê o histórico do chat e responde automaticamente em nome da administração
Quando desativado → somente admins respondem manualmente
Status visível no painel (IA ativa / manual)




Funcionamento da IA (OpenAI)

Roda no backend (nunca expor a chave no frontend)
Quando IA está ativa para um chamado:

Nova mensagem da clínica chega
Backend monta o histórico completo do chat
Envia para OpenAI com um system prompt definindo o papel:



  Você é um agente de suporte da AutomaClinic. Responda de forma clara, 
  objetiva e cordial. Ajude a clínica a resolver seu problema.

Resposta da IA é salva no banco como se fosse do admin
Enviada em tempo real para a clínica via WebSocket


Estrutura do Banco de Dados
sql-- Tabela de tickets/chamados
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id),
  assunto VARCHAR(255),
  problema VARCHAR(255),
  status VARCHAR(50) DEFAULT 'aberto', -- aberto, em_atendimento, resolvido
  ia_ativa BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de mensagens do chat
CREATE TABLE support_messages (
  id UUID PRIMARY KEY,
  ticket_id UUID REFERENCES support_tickets(id),
  remetente VARCHAR(50), -- 'clinica', 'admin', 'ia'
  mensagem TEXT,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Tempo Real — WebSocket

- Conexão WebSocket entre frontend (clínica e admin) e backend
- Eventos necessários:
  - `novo_ticket` → admin é notificado quando clínica abre chamado
  - `nova_mensagem` → ambos recebem mensagens instantaneamente
  - `ia_status_changed` → notifica quando IA é ativada/desativada
  - `ticket_resolvido` → fecha o chamado

---

## Fluxo Completo
```
Clínica abre chamado (assunto + problema + mensagem)
          ↓
   Salva no banco → WebSocket notifica admins
          ↓
Admin responde manualmente  OU  Ativa IA
          ↓
   [IA ATIVA] Backend recebe mensagem da clínica
          → Monta histórico → Chama OpenAI
          → Salva resposta → WebSocket envia para clínica
          ↓
Clínica recebe resposta em tempo real

Observações Técnicas

Chave da OpenAI em variável de ambiente OPENAI_API_KEY
Modelo recomendado: gpt-4o-mini (custo baixo, rápido)
Limitar histórico enviado à IA (últimas 20 mensagens) para controlar custo de tokens
Admin pode assumir o chat manualmente a qualquer momento desativando a IA
Badge de notificação no painel admin mostrando quantos chamados aguardam resposta