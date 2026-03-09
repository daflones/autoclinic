# AutoClinic - Documentação Completa da Stack

## 📋 Visão Geral

**AutoClinic** é um CRM completo para clínicas de estética com automação inteligente via WhatsApp e Instagram, integração com IA, gestão de pacientes, agendamentos, procedimentos e relatórios.

---

## 🏗️ Arquitetura do Sistema

### **Arquitetura Híbrida**
- **Frontend**: React SPA (Single Page Application)
- **Backend**: Node.js/Express para WhatsApp Web e APIs auxiliares
- **Database**: Supabase (PostgreSQL)
- **Integrações**: Evolution API (WhatsApp), Instagram Graph API

### **Fluxo de Dados**
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│ Vite Dev     │─────▶│  Supabase   │
│  (React)    │      │ Server :5173 │      │  PostgreSQL │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │                     ▼
       │             ┌──────────────┐
       └────────────▶│ Express      │
                     │ Server :3000 │
                     └──────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │Evolution │ │Instagram │ │WhatsApp  │
         │   API    │ │Graph API │ │ Web.js   │
         └──────────┘ └──────────┘ └──────────┘
```

---

## 🛠️ Stack Tecnológica

### **Frontend**

#### **Core**
- **React 18.2.0** - Biblioteca UI
- **TypeScript 5.2.0** - Tipagem estática
- **Vite 5.0.0** - Build tool e dev server
- **React Router DOM 6.20.1** - Roteamento SPA

#### **State Management**
- **Zustand 4.5.7** - Estado global leve
- **TanStack React Query 5.85.9** - Cache e sincronização de dados server-side
- **React Hook Form 7.62.0** - Gerenciamento de formulários

#### **UI/UX**
- **Tailwind CSS 3.4.0** - Framework CSS utility-first
- **Radix UI** - Componentes acessíveis headless:
  - Dialog, Dropdown, Select, Tabs, Tooltip, etc.
- **Lucide React 0.294.0** - Ícones
- **Framer Motion 10.18.0** - Animações
- **React Spring 9.7.3** - Animações baseadas em física
- **Lottie React 2.4.0** - Animações JSON

#### **Calendário & Agendamentos**
- **FullCalendar 6.1.9** - Calendário interativo
  - daygrid, timegrid, interaction plugins
- **React Day Picker 9.11.0** - Seletor de datas
- **date-fns 2.30.0** - Manipulação de datas

#### **Gráficos & Visualização**
- **Chart.js 4.4.0** - Biblioteca de gráficos
- **React ChartJS 2 5.2.0** - Wrapper React para Chart.js
- **Recharts 2.8.0** - Gráficos compostos

#### **Upload & Mídia**
- **Uppy 3.7.0** - Upload de arquivos
  - core, drag-drop, react plugins
- **React Dropzone 14.2.3** - Drag & drop de arquivos
- **React Player 3.4.0** - Player de vídeo (Instagram)

#### **Validação & Formulários**
- **Zod 3.25.76** - Schema validation
- **@hookform/resolvers 3.10.0** - Integração Zod + React Hook Form

#### **Notificações**
- **Sonner 1.2.4** - Toast notifications modernas
- **React Hot Toast 2.4.1** - Toast alternativo

#### **Utilitários**
- **Axios 1.6.2** - Cliente HTTP
- **clsx 2.1.1** + **tailwind-merge 2.6.0** - Merge de classes CSS
- **class-variance-authority 0.7.1** - Variantes de componentes

#### **PWA**
- **vite-plugin-pwa 1.0.3** - Progressive Web App

---

### **Backend**

#### **Core**
- **Node.js** (ES Modules)
- **Express 5.1.0** - Framework web
- **dotenv 17.2.3** - Variáveis de ambiente

#### **WhatsApp**
- **whatsapp-web.js 1.34.1** - Cliente WhatsApp Web
- **qrcode 1.5.4** - Geração de QR Code
- **qrcode-terminal 0.12.0** - QR Code no terminal
- **ws 8.18.3** - WebSocket server

#### **Segurança & Auth**
- **bcrypt 6.0.0** - Hash de senhas
- **jsonwebtoken 9.0.3** - JWT tokens
- **cors 2.8.5** - CORS middleware

#### **Integrações**
- **@supabase/supabase-js 2.76.1** - Cliente Supabase
- **axios 1.6.2** - HTTP client para APIs externas

#### **Relatórios**
- **jspdf 3.0.3** - Geração de PDFs
- **jspdf-autotable 5.0.2** - Tabelas em PDF

#### **Áudio**
- **howler 2.2.4** - Reprodução de áudio

---

### **Database & Backend Services**

#### **Supabase (PostgreSQL)**
- **Auth** - Autenticação de usuários
- **Database** - PostgreSQL com Row Level Security
- **Storage** - Armazenamento de arquivos
- **Realtime** - Subscriptions em tempo real (opcional)

#### **Tabelas Principais**
- `profiles` - Perfis de usuários
- `pacientes` - Cadastro de pacientes
- `procedimentos` - Procedimentos disponíveis
- `agendamentos` - Agendamentos de consultas
- `planos_tratamento` - Planos de tratamento
- `whatsapp_conversas` - Conversas WhatsApp
- `whatsapp_mensagens` - Mensagens WhatsApp
- `instagram_posts` - Posts do Instagram

---

### **Integrações Externas**

#### **Evolution API**
- WhatsApp Business API
- Envio/recebimento de mensagens
- Gerenciamento de instâncias
- Webhooks para eventos

#### **Instagram Graph API**
- Busca de posts, comentários, DMs
- Envio de respostas
- Reações e interações
- Criação de posts

#### **Mercado Pago** (Opcional)
- Processamento de pagamentos
- Assinaturas recorrentes

---

## 📦 Dependências Completas

### **Produção (dependencies)**

```json
{
  "@fullcalendar/daygrid": "^6.1.9",
  "@fullcalendar/interaction": "^6.1.9",
  "@fullcalendar/react": "^6.1.9",
  "@fullcalendar/timegrid": "^6.1.9",
  "@headlessui/react": "^2.2.7",
  "@heroicons/react": "^2.0.18",
  "@hookform/resolvers": "^3.10.0",
  "@radix-ui/react-accordion": "^1.1.2",
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-checkbox": "^1.0.4",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-popover": "^1.0.7",
  "@radix-ui/react-progress": "^1.1.7",
  "@radix-ui/react-radio-group": "^1.1.3",
  "@radix-ui/react-scroll-area": "^1.2.10",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-separator": "^1.0.3",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-switch": "^1.0.3",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-tooltip": "^1.0.7",
  "@supabase/supabase-js": "^2.76.1",
  "@tanstack/react-query": "^5.85.9",
  "@uppy/core": "^3.7.0",
  "@uppy/drag-drop": "^3.0.3",
  "@uppy/react": "^3.2.0",
  "axios": "^1.6.2",
  "bcrypt": "^6.0.0",
  "chart.js": "^4.4.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "cors": "^2.8.5",
  "date-fns": "^2.30.0",
  "dotenv": "^17.2.3",
  "express": "^5.1.0",
  "framer-motion": "^10.18.0",
  "howler": "^2.2.4",
  "jsonwebtoken": "^9.0.3",
  "jspdf": "^3.0.3",
  "jspdf-autotable": "^5.0.2",
  "lottie-react": "^2.4.0",
  "lucide-react": "^0.294.0",
  "qrcode": "^1.5.4",
  "qrcode-terminal": "^0.12.0",
  "react": "^18.2.0",
  "react-beautiful-dnd": "^13.1.1",
  "react-chartjs-2": "^5.2.0",
  "react-day-picker": "^9.11.0",
  "react-dom": "^18.2.0",
  "react-dropzone": "^14.2.3",
  "react-hook-form": "^7.62.0",
  "react-hot-toast": "^2.4.1",
  "react-player": "^3.4.0",
  "react-router-dom": "^6.20.1",
  "react-spring": "^9.7.3",
  "recharts": "^2.8.0",
  "sonner": "^1.2.4",
  "tailwind-merge": "^2.6.0",
  "tailwindcss-animate": "^1.0.7",
  "whatsapp-web.js": "^1.34.1",
  "ws": "^8.18.3",
  "zod": "^3.25.76",
  "zustand": "^4.5.7"
}
```

### **Desenvolvimento (devDependencies)**

```json
{
  "@tanstack/react-query-devtools": "^5.85.9",
  "@types/node": "^20.10.4",
  "@types/react": "^18.2.0",
  "@types/react-beautiful-dnd": "^13.1.5",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.2.0",
  "autoprefixer": "^10.4.16",
  "concurrently": "^9.2.1",
  "eslint": "^8.55.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-react": "^7.33.2",
  "eslint-plugin-react-hooks": "^4.6.0",
  "eslint-plugin-react-refresh": "^0.4.5",
  "postcss": "^8.4.32",
  "prettier": "^3.1.0",
  "supabase": "^2.48.3",
  "tailwindcss": "^3.4.0",
  "typescript": "^5.2.0",
  "vite": "^5.0.0",
  "vite-plugin-pwa": "^1.0.3"
}
```

---

## 🚀 Como Rodar o Projeto

### **Pré-requisitos**

1. **Node.js** >= 18.x
2. **npm** ou **yarn**
3. **Conta Supabase** (gratuita)
4. **Evolution API** (para WhatsApp)
5. **Instagram Business Account** (para Instagram)

---

### **1. Instalação**

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd AutoClinic

# Instale as dependências
npm install
```

---

### **2. Configuração de Variáveis de Ambiente**

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

#### **Variáveis Obrigatórias**

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Evolution API (WhatsApp)
VITE_EVOLUTION_API_URL=https://sua-instancia.evolutionapi.com
VITE_EVOLUTION_API_KEY=sua-api-key
EVOLUTION_API_URL=https://sua-instancia.evolutionapi.com
EVOLUTION_API_KEY=sua-api-key

# Servidor WhatsApp
PORT=3000
WHATSAPP_SERVER_PORT=3000
```

#### **Variáveis Opcionais**

```env
# Instagram (se usar integração)
VITE_INSTAGRAM_APP_ID=seu-app-id
VITE_INSTAGRAM_APP_SECRET=seu-app-secret

# Mercado Pago (se usar pagamentos)
VITE_MERCADO_PAGO_PUBLIC_KEY=sua-public-key
VITE_MERCADO_PAGO_ACCESS_TOKEN=seu-access-token
```

---

### **3. Configuração do Supabase**

#### **3.1. Criar Projeto no Supabase**
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e as chaves (anon key e service role key)

#### **3.2. Executar Migrações**
```bash
# Instale a CLI do Supabase (se ainda não tiver)
npm install -g supabase

# Faça login
supabase login

# Link com seu projeto
supabase link --project-ref seu-project-ref

# Execute as migrações
supabase db push
```

As migrações estão em `supabase/migrations/`.

#### **3.3. Configurar Storage**
No painel do Supabase:
1. Vá em **Storage**
2. Crie os buckets:
   - `midias` (público)
   - `documentos` (privado)
   - `avatars` (público)

---

### **4. Configuração da Evolution API**

1. Tenha uma instância da Evolution API rodando
2. Crie uma instância para seu WhatsApp:
   ```bash
   POST https://sua-instancia.evolutionapi.com/instance/create
   {
     "instanceName": "autoclinic",
     "qrcode": true
   }
   ```
3. Copie a API Key gerada
4. Configure no `.env`

---

### **5. Executar o Projeto**

#### **Modo Desenvolvimento (Recomendado)**

Roda frontend (Vite) e backend (Express) simultaneamente:

```bash
npm run dev
```

Isso inicia:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

#### **Apenas Frontend**

```bash
npm run dev-only
```

#### **Apenas Backend (WhatsApp Server)**

```bash
npm run whatsapp-server
```

---

### **6. Build para Produção**

```bash
# Build do frontend
npm run build

# Servir em produção (frontend + backend)
npm start
```

O servidor Express serve tanto a API quanto os arquivos estáticos do frontend buildado.

---

## 📂 Estrutura de Pastas

```
AutoClinic/
├── src/                          # Código-fonte frontend
│   ├── components/               # Componentes React
│   │   ├── layout/              # Layout (Sidebar, MobileNav)
│   │   ├── ui/                  # Componentes UI (shadcn/ui)
│   │   └── whatsapp/            # Componentes WhatsApp
│   ├── pages/                   # Páginas/rotas
│   │   ├── pacientes/           # Gestão de pacientes
│   │   ├── agendamentos/        # Agendamentos
│   │   ├── instagram/           # Instagram
│   │   └── chat/                # Chat WhatsApp
│   ├── hooks/                   # Custom hooks
│   ├── services/                # Serviços/APIs
│   │   └── api/                 # Clientes API
│   ├── stores/                  # Zustand stores
│   ├── lib/                     # Utilitários
│   └── App.tsx                  # Componente raiz
├── supabase/                    # Configuração Supabase
│   ├── migrations/              # Migrações SQL
│   └── config.toml              # Config local
├── public/                      # Assets estáticos
├── whatsapp-server.js           # Servidor Express backend
├── vite.config.ts               # Config Vite
├── tailwind.config.js           # Config Tailwind
├── package.json                 # Dependências
└── .env                         # Variáveis de ambiente
```

---

## 🔧 Scripts Disponíveis

```json
{
  "dev": "Roda frontend + backend simultaneamente",
  "dev-only": "Roda apenas frontend (Vite)",
  "whatsapp-server": "Roda apenas backend (Express)",
  "build": "Build de produção do frontend",
  "preview": "Preview do build (porta 3000)",
  "start": "Servidor de produção (frontend + backend)",
  "lint": "Executa ESLint"
}
```

---

## 🌐 Portas Utilizadas

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Vite Dev Server | 5173 | Frontend em desenvolvimento |
| Express Backend | 3000 | API e WhatsApp server |
| Vite Preview | 3000 | Preview de produção |

**Proxy**: Vite faz proxy de `/api/*` para `http://localhost:3000` em desenvolvimento.

---

## 🔐 Autenticação e Permissões

### **Roles de Usuário**
- `clinica` - Dono da clínica (acesso total)
- `admin` - Administrador (acesso total)
- `profissional` - Profissional da clínica
- `recepcao` - Recepcionista
- `gestor` - Gestor

### **Fluxo de Auth**
1. Login via Supabase Auth
2. JWT token armazenado no localStorage
3. RLS (Row Level Security) no Supabase
4. Middleware `requireAuth` no backend Express

---

## 📊 Funcionalidades Principais

### **Gestão de Pacientes**
- Cadastro completo com foto
- Histórico de atendimentos
- Tags e categorização
- Status (ativo/arquivado)
- Atualização em tempo real (polling 10s)

### **Agendamentos**
- Calendário interativo (FullCalendar)
- Lista de espera
- No-shows tracking
- Sugestões de retorno
- Notificações WhatsApp

### **WhatsApp**
- Chat em tempo real
- Disparos em massa
- Templates de mensagem
- Envio de mídia (imagem, vídeo, áudio)
- QR Code para conexão
- Integração Evolution API

### **Instagram**
- Feed de posts
- Comentários e respostas
- DMs (Direct Messages)
- Reações
- Criação de posts
- Instagram Graph API

### **Procedimentos**
- Cadastro de procedimentos
- Categorias de tratamento
- Protocolos/Pacotes
- Planos de tratamento

### **Relatórios**
- Procedimentos realizados
- Agendamentos realizados
- Exportação PDF
- Gráficos e analytics

---

## 🐛 Troubleshooting

### **Erro: "Cannot find module"**
```bash
rm -rf node_modules package-lock.json
npm install
```

### **Erro de CORS**
Verifique se o proxy do Vite está configurado corretamente em `vite.config.ts`.

### **WhatsApp não conecta**
1. Verifique se a Evolution API está rodando
2. Confirme as credenciais no `.env`
3. Gere um novo QR Code

### **Supabase RLS bloqueando queries**
Verifique as políticas RLS no painel do Supabase. Use `SUPABASE_SERVICE_ROLE_KEY` no backend para bypass.

---

## 📝 Notas Importantes

1. **ES Modules**: O projeto usa `"type": "module"` no package.json
2. **TypeScript**: Frontend usa TS, backend usa JS puro
3. **Proxy**: `/api` é proxied para o backend em dev
4. **Build**: Frontend é buildado para `dist/` e servido pelo Express
5. **PWA**: Configurado mas pode ser desabilitado se não necessário

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é proprietário e confidencial.

---

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.
