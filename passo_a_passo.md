Aqui está a análise e reescrita clara das instruções:

PROMPT — Página de Administração
Acesso e Autenticação

Rota: /admin-page
Tabela no banco: admins com colunas email, password_hash e cargo
Apenas usuários com cargo = 'dev' podem acessar
Senha armazenada com password_hash (bcrypt)
Login via email + senha, validado contra a tabela admins
Se não autenticado ou cargo diferente de dev → redireciona para login ou retorna 403

SQL de seed — criar primeiro admin:
sqlINSERT INTO admins (email, password_hash, cargo)
VALUES (
  'nanosyncdev@gmail.com',
  '$2b$10$HASH_GERADO_DO_226602Ju$$$', -- gerar com bcrypt antes de inserir
  'dev'
);

O sistema deve ter uma função utilitária para gerar o hash antes de rodar o seed.


Funcionalidades da Página de Admin
1. Gestão de Admins

Criar novos usuários admin com cargo dev
Listar admins existentes
Deletar admins


2. Gestão de Clínicas
Painel com todas as clínicas cadastradas, exibindo:

Nome, email, plano contratado, status do plano
Data de vencimento da mensalidade

Filtros de status:

✅ Em dia — plano ativo e mensalidade paga
⚠️ Em atraso — já foi cliente, plano vencido e não renovou
❌ Sem plano — se cadastrou mas nunca comprou um plano

Ações por clínica:

Ativar ou desativar plano manualmente
Editar informações da clínica
Deletar clínica e todos os dados vinculados
Ver procedimentos cadastrados
Ver clientes da clínica
Ver histórico de planos contratados


3. Monitoramento de Instâncias WhatsApp

Listar a instância Evolution API de cada clínica
Ver status da conexão em tempo real (conectado / desconectado / aguardando QR)
Possibilidade de verificar/reiniciar instância direto pelo painel


4. Chats das Clínicas

Acessar e visualizar os chats de cada clínica pelo painel admin
Leitura em tempo real


5. Gestão de Planos e Preços

Alterar os valores dos planos diretamente pelo painel admin
As alterações refletem automaticamente na landing page e na página de planos do sistema
Os valores devem ser salvos no banco e consumidos dinamicamente pelo frontend (sem hardcode)


Observações Técnicas

Todos os dados devem ser carregados em tempo real (websocket ou polling)
Todas as ações destrutivas (deletar, desativar) devem ter confirmação antes de executar
A página deve ser protegida tanto no frontend (rota privada) quanto no backend (middleware de autenticação + verificação de cargo)