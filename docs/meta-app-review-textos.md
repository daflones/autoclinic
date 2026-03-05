# Meta App Review — Textos e Instruções de Screencast
# AutomaClinic — App: 1266499315674948

> Copie e cole o texto de cada permissão no campo "Forneça uma descrição detalhada..."
> Grave um vídeo separado para cada permissão conforme as instruções abaixo.

---

## ANTES DE COMEÇAR

1. Instale o software de gravação de tela: **OBS Studio** (gratuito) ou **Loom** (loom.com)
2. Abra o AutomaClinic no navegador (aba 1) e o Meta Developer (aba 2)
3. Sua conta Instagram da clínica deve estar conectada no AutomaClinic antes de gravar
4. Os vídeos devem ter entre **1 e 5 minutos** e mostrar o fluxo completo do usuário

---

## 1. Instagram Public Content Access

### Texto (cole no campo de descrição):
```
O AutomaClinic é uma plataforma SaaS de gestão para clínicas de saúde e estética. 
O recurso "Instagram Public Content Access" é usado para permitir que clínicas 
cadastradas na plataforma acessem e monitorem o conteúdo público de suas próprias 
contas profissionais do Instagram. Isso inclui visualização de posts publicados, 
dados de engajamento (curtidas, comentários), e rastreamento de hashtags relevantes 
para a área de saúde. Essa funcionalidade permite que os gestores das clínicas 
acompanhem o desempenho do seu conteúdo diretamente no painel do AutomaClinic, 
sem precisar alternar entre plataformas. O recurso é essencial para que clínicas 
possam gerenciar sua presença digital de forma centralizada e eficiente.
```

### O que gravar no vídeo:
1. Abra o AutomaClinic → vá para a página **Instagram**
2. Mostre a tela de login → clique em "Entrar com Instagram"
3. Complete o fluxo OAuth (autorização)
4. Após conectar, mostre o **feed de posts** da clínica carregando na tela
5. Clique em um post para mostrar detalhes (likes, comentários)

---

## 2. instagram_manage_insights

### Texto:
```
A permissão instagram_manage_insights é utilizada para permitir que os gestores 
das clínicas cadastradas no AutomaClinic visualizem as métricas de desempenho 
de suas publicações e do perfil no Instagram. Os dados acessados incluem: 
alcance de posts, impressões, visitas ao perfil, crescimento de seguidores e 
engajamento por publicação. Essas informações são exibidas em um painel de 
analytics dentro do AutomaClinic, permitindo que a clínica tome decisões 
baseadas em dados sobre sua estratégia de conteúdo no Instagram. Nenhum dado 
de terceiros é coletado — apenas dados da própria conta da clínica autenticada.
```

### O que gravar:
1. Mostre o painel do AutomaClinic → seção Instagram
2. Navegue até a aba de **métricas/insights**
3. Mostre gráficos com alcance, impressões, seguidores
4. Clique em um post específico e mostre as métricas dele

---

## 3. instagram_manage_messages

### ⚠️ ATENÇÃO — campo especial (Image 8)
Na caixa amarela de aviso, selecione a opção:
**"using and processing data on behalf of other Instagram business accounts"**
(sua app serve MÚLTIPLAS clínicas, não apenas uma conta própria)

### Texto:
```
O AutomaClinic é um sistema de gestão para clínicas (SaaS multi-tenant). 
A permissão instagram_manage_messages é solicitada para permitir que cada 
clínica cadastrada na plataforma acesse e responda mensagens diretas (DMs) 
recebidas no Instagram da sua própria conta profissional. Cada clínica 
autentica sua conta individualmente via OAuth — nenhum token é compartilhado 
entre clínicas. O uso principal é: pacientes que entram em contato via 
Instagram Direct são atendidos pelo gestor da clínica diretamente no 
AutomaClinic, sem precisar abrir o aplicativo do Instagram. A permissão 
é necessária porque o AutomaClinic atua como ferramenta de CRM de 
atendimento ao cliente para múltiplas contas Instagram Business.
```

### O que gravar:
1. Mostre a clínica logada no AutomaClinic
2. Vá para a seção **DMs / Mensagens Diretas** do Instagram
3. Mostre uma lista de conversas de pacientes
4. Abra uma conversa e mostre a resposta sendo enviada
5. Mostre que o token é da conta da própria clínica (perfil conectado)

---

## 4. instagram_manage_comments

### Texto:
```
A permissão instagram_manage_comments permite que as clínicas cadastradas 
no AutomaClinic visualizem e respondam comentários feitos em suas publicações 
do Instagram. Clínicas frequentemente recebem perguntas, elogios e solicitações 
de agendamento nos comentários dos seus posts. Com essa permissão, o gestor 
pode responder diretamente pelo AutomaClinic, sem precisar acessar o Instagram 
separadamente. Também é usada para moderar comentários inadequados. 
Todos os dados são restritos à conta da própria clínica autenticada.
```

### O que gravar:
1. Abra o AutomaClinic → Instagram → aba **Comentários**
2. Mostre a lista de comentários de um post
3. Clique em um comentário e responda
4. Mostre o comentário sendo publicado

---

## 5. instagram_business_manage_messages

### Texto:
```
A permissão instagram_business_manage_messages é a versão Business da 
permissão de mensagens, necessária para contas Instagram do tipo 
Business/Professional. O AutomaClinic atende clínicas que utilizam 
contas Instagram Business, e esta permissão permite que essas clínicas 
recebam e respondam mensagens diretas de pacientes diretamente pela 
plataforma. O AutomaClinic funciona como uma central de atendimento 
(CRM) onde o gestor da clínica pode ver todas as mensagens do 
Instagram Business de seus pacientes e respondê-las em tempo real.
```

### O que gravar:
- Mesmo vídeo de instagram_manage_messages (pode reutilizar)
- Foque em mostrar que a conta conectada é do tipo **Business/Profissional**

---

## 6. instagram_content_publish

### Texto:
```
A permissão instagram_content_publish é usada para permitir que as 
clínicas publiquem posts no Instagram diretamente pelo AutomaClinic. 
Clínicas podem criar, agendar e publicar imagens e vídeos de divulgação 
de serviços, promoções e conteúdo educativo sobre saúde. Isso elimina 
a necessidade de alternar entre plataformas, centralizando o gerenciamento 
de marketing da clínica. A publicação ocorre sempre sob autorização 
explícita do gestor da clínica, na conta autenticada via OAuth.
```

### O que gravar:
1. Abra AutomaClinic → Instagram → aba **Publicar**
2. Selecione uma imagem
3. Adicione legenda
4. Clique em **Publicar** e mostre a confirmação

---

## 7. instagram_business_content_publish

### Texto:
```
Versão Business da permissão de publicação. O AutomaClinic utiliza 
instagram_business_content_publish para permitir que clínicas com 
contas Instagram Business publiquem conteúdo diretamente pela plataforma. 
Inclui publicação de fotos, vídeos e reels de conteúdo relacionado 
a serviços de saúde e estética. Cada publicação é autorizada 
individualmente pelo gestor da clínica autenticada.
```

### O que gravar:
- Mesmo vídeo de instagram_content_publish, mostrando conta Business

---

## 8. instagram_business_manage_insights

### Texto:
```
A permissão instagram_business_manage_insights permite que clínicas 
com contas Instagram Business visualizem métricas detalhadas de suas 
publicações e perfil no AutomaClinic. Os dados incluem: alcance por 
faixa etária e gênero, impressões, engajamento, crescimento de 
seguidores e performance por tipo de conteúdo. Essas informações 
são apresentadas em dashboards dentro do AutomaClinic, auxiliando 
a clínica a otimizar sua estratégia de conteúdo no Instagram.
```

### O que gravar:
- Mesmo vídeo de instagram_manage_insights, mostrando conta Business

---

## 9. instagram_business_manage_comments

### Texto:
```
A permissão instagram_business_manage_comments permite que clínicas 
com contas Instagram Business gerenciem comentários de suas publicações 
diretamente pelo AutomaClinic. Gestores podem visualizar comentários 
de pacientes, responder perguntas sobre procedimentos e preços, 
e moderar comentários inapropriados, tudo sem sair da plataforma. 
Aplica-se exclusivamente à conta Business autenticada por cada clínica.
```

### O que gravar:
- Mesmo vídeo de instagram_manage_comments, mostrando conta Business

---

## 10. instagram_business_basic

### Texto:
```
A permissão instagram_business_basic é utilizada para exibir as 
informações básicas do perfil Instagram Business de cada clínica 
cadastrada no AutomaClinic. Isso inclui: nome de usuário, foto de 
perfil, biografia, quantidade de seguidores, quantidade de contas 
seguidas e lista de publicações. Essas informações são exibidas 
no painel da clínica como um resumo do perfil Instagram conectado, 
confirmando a autenticação e permitindo navegação pelo conteúdo próprio.
```

### O que gravar:
1. Após conectar o Instagram no AutomaClinic, mostre o **painel com dados do perfil**
2. Mostre: foto de perfil, nome, seguidores, posts
3. Navegue pela lista de posts da conta

---

## 11. instagram_basic

### Texto:
```
A permissão instagram_basic é usada para ler as informações básicas 
do perfil Instagram das clínicas autenticadas no AutomaClinic, incluindo 
nome de usuário, ID da conta, foto de perfil e lista de mídias publicadas. 
É a permissão fundamental para identificar e exibir o perfil da clínica 
conectada dentro da plataforma, servindo como base para as demais 
funcionalidades de gerenciamento de Instagram.
```

### O que gravar:
- Mesmo vídeo de instagram_business_basic

---

## 12. email

### Texto:
```
A permissão email é utilizada exclusivamente para autenticação do 
usuário durante o processo de login com o Facebook/Meta. O endereço 
de e-mail é usado para identificar e associar a conta da clínica 
no AutomaClinic com suas credenciais Meta, garantindo uma experiência 
de login segura e personalizada. O e-mail não é armazenado nem 
compartilhado com terceiros.
```

### O que gravar:
- Mostre a tela de login OAuth (sem precisar de vídeo separado, pode incluir em outro)

---

## 13. public_profile

### Texto:
```
A permissão public_profile é usada para obter informações básicas 
do perfil público do usuário Meta durante a autenticação OAuth no 
AutomaClinic. Esses dados (nome e foto) são usados apenas para 
personalizar a experiência de login dentro da plataforma. Nenhuma 
informação de perfil público é armazenada além do necessário para 
a sessão autenticada.
```

### O que gravar:
- Sem vídeo separado necessário — inclua no vídeo de login

---

## GUIA DE GRAVAÇÃO (resumo prático)

### Você vai precisar de 4 vídeos principais:

| Vídeo | Cobre estas permissões |
|---|---|
| **Vídeo 1 — Login + Perfil** | instagram_basic, instagram_business_basic, email, public_profile |
| **Vídeo 2 — Posts + Insights** | instagram_manage_insights, instagram_business_manage_insights, Instagram Public Content Access |
| **Vídeo 3 — Comentários** | instagram_manage_comments, instagram_business_manage_comments |
| **Vídeo 4 — Mensagens DM** | instagram_manage_messages, instagram_business_manage_messages |
| **Vídeo 5 — Publicar** | instagram_content_publish, instagram_business_content_publish |

### Roteiro de cada vídeo:
1. Comece mostrando a URL do AutomaClinic na barra do navegador
2. Mostre a página do Instagram no sistema
3. Se necessário, mostre o login OAuth (só no Vídeo 1)
4. Demonstre a funcionalidade específica em uso
5. Mostre a resposta/resultado da ação

### Onde tirar prints das telas do AutomaClinic:
- **Print do perfil conectado**: AutomaClinic → Instagram → topo da página (mostra username e foto)
- **Print do feed**: AutomaClinic → Instagram → aba Feed/Posts
- **Print de DMs**: AutomaClinic → Instagram → aba Mensagens
- **Print de comentários**: AutomaClinic → Instagram → aba Comentários
- **Print de insights**: AutomaClinic → Instagram → aba Métricas

---

## ⚠️ AVISO ESPECIAL — instagram_manage_messages (Image 8)

Na caixa amarela desta permissão, o Meta pergunta se você está pedindo:
- Para sua **própria conta** → selecione a opção de baixo
- Para **outras contas de negócio** (SaaS) → selecione a opção de cima

Como o AutomaClinic serve **múltiplas clínicas**, selecione:
**"using and processing data on behalf of other Instagram business accounts"**

Isso abrirá requisitos adicionais — você precisará fornecer:
- Link da **Política de Privacidade** do AutomaClinic
- Descrição de como as clínicas autorizam o acesso (OAuth individual)
- Demonstração de que cada clínica tem controle sobre seus próprios dados
