# Deploy — NutriKanban

## 1. Banco de dados (Supabase Postgres)

No painel do Supabase → botão **Connect** (topo do dashboard) → aba **Connection string**, copie:

- **Transaction pooler** (porta `6543`) → variável `DATABASE_URL` (usada pelo app em runtime)
- **Session pooler** (porta `5432`) → variável `DIRECT_URL` (usada pelo Prisma CLI para `db push`/migrations)

> Usamos o **Session pooler** em vez da "Direct connection" porque a conexão direta do Supabase é IPv6-only por padrão — em redes/ambientes só-IPv4 (comum em casa e em alguns runtimes) ela não conecta. O Session pooler resolve isso (é a alternativa oficial recomendada pelo próprio Supabase pra IPv4).

Cole as duas no `.env` local, depois rode:

```bash
npm run db:push              # cria as tabelas no Postgres
npm run db:import-postgres   # importa o backup local (prisma/data-export.json) com os dados reais
```

## 2. Variáveis de ambiente (Vercel)

Configure em Vercel → Project Settings → Environment Variables:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Transaction pooler do Supabase (porta 6543) |
| `DIRECT_URL` | Session pooler do Supabase (porta 5432) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SECRET_KEY` | chave secreta do Supabase (Storage — fotos de receitas/alimentos/exames) |
| `RESEND_API_KEY` | API key do Resend (opcional — sem ela, envio de formulário fica em modo de teste/log) |
| `EMAIL_FROM` | remetente do e-mail, ex: `NutriKanban <onboarding@resend.dev>` |
| `NEXT_PUBLIC_APP_URL` | URL pública do site em produção, ex: `https://seu-projeto.vercel.app` |
| `GEMINI_API_KEY` | API key do Google Gemini — usada para importar dados da balança e resultados de exames em PDF via IA. Sem ela, esses botões de importação mostram "GEMINI_API_KEY não configurada no servidor". |

> **Importante:** o `.env` local nunca é commitado (está no `.gitignore`) — as variáveis precisam ser cadastradas manualmente em Vercel → Project Settings → Environment Variables (copie os mesmos valores do `.env` local). Depois de adicionar/alterar uma variável, é preciso fazer um novo deploy (ou "Redeploy" no painel da Vercel) para ela entrar em vigor.

## 3. Deploy

Conectar o repositório GitHub (`tedescobruno2-maker/nutri-o`) ao Vercel — framework Next.js é detectado automaticamente, nenhuma configuração extra de build é necessária.

## Observações

- O upload de fotos de receitas usa o Supabase Storage quando `SUPABASE_URL`/`SUPABASE_SECRET_KEY` estão configurados (bucket `uploads`, criado automaticamente no primeiro upload). Sem essas variáveis, cai em modo de desenvolvimento local (grava em `public/uploads`, que **não persiste** em produção serverless).
- A pasta `PACIENTES/` (documentos originais dos pacientes) e o arquivo `prisma/data-export.json` (backup dos dados reais) nunca são commitados — ficam só na máquina local (ver `.gitignore`).
