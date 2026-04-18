# Diário IA

App de diário pessoal mobile-first onde o usuário escreve livremente e a IA analisa humor, emoções e temas em background.

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 18 (standalone + Signals) |
| Mobile | Ionic 8 |
| Backend / Auth | Supabase |
| IA | Groq API — `llama-3.1-8b-instant` |

## Funcionalidades

- **Autenticação** — login e cadastro com e-mail/senha via Supabase Auth
- **Diário** — campo de escrita livre com salvamento imediato
- **Perguntas guiadas** — botão "Me ajude a começar" sorteia uma pergunta reflexiva para inspirar a escrita
- **Análise de IA** — processamento em background a cada entrada salva:
  - Humor do dia (escala 1–10)
  - Emoção principal detectada
  - Temas identificados (trabalho, família, saúde...)
- **Dashboard de insights:**
  - Streak de dias consecutivos escritos
  - Humor médio dos últimos 7 dias
  - Gráfico de barras semanal
  - Gráfico de tendência dos últimos 30 dias (SVG)
  - Emoção predominante da semana
  - Temas recorrentes com tamanho proporcional à frequência
  - Insight semanal gerado pela IA

## Setup

### 1. Clonar e instalar

```bash
git clone https://github.com/wesllenfe/diario-ia.git
cd diario-ia/diario-app
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Edite `environment.ts` com suas chaves:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://SEU_PROJECT_ID.supabase.co',
  supabaseKey: 'sb_publishable_...',
  groqKey: 'gsk_...',
};
```

### 3. Criar conta no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Em **SQL Editor**, execute `supabase-setup.sql` e depois `supabase-fase2.sql`
3. Copie a **Project URL** e a **publishable key** para `environment.ts`

### 4. Criar conta no Groq

1. Acesse [console.groq.com](https://console.groq.com)
2. Gere uma API Key e cole em `environment.ts` como `groqKey`

### 5. Rodar

```bash
npm start
# ou
ionic serve
```

Acesse `http://localhost:8100`

## Estrutura

```
src/
├── app/
│   ├── components/
│   │   └── bottom-nav.component.ts  # Navegação inferior
│   ├── guards/
│   │   └── auth.guard.ts            # Protege rotas autenticadas
│   ├── pages/
│   │   ├── auth/                    # Login e cadastro
│   │   ├── diario/                  # Escrita + listagem + perguntas guiadas
│   │   └── dashboard/               # Métricas + gráficos + insights IA
│   ├── services/
│   │   ├── supabase.service.ts      # Auth + CRUD entradas
│   │   ├── groq.service.ts          # Análise de entrada + insight semanal
│   │   └── dashboard.service.ts     # Agregação de métricas
│   └── app.routes.ts
├── environments/
│   ├── environment.example.ts       # Template — versionado
│   └── environment.ts               # Chaves reais — no .gitignore
└── theme/
    └── variables.scss               # Design system (Sage + Cream)
```

## SQL

Execute na ordem no Supabase SQL Editor:

1. `supabase-setup.sql` — cria tabela `entradas` com RLS
2. `supabase-fase2.sql` — adiciona colunas de análise de IA

## Fases

| Fase | Status | Descrição |
|---|---|---|
| 1 | ✅ | Auth + diário + listagem |
| 2 | ✅ | Análise de IA com Groq |
| 3 | ✅ | Dashboard com métricas, gráficos e insight IA |
