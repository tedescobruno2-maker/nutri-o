# Deploy — NutriKanban

## 1. Banco de dados (Supabase Postgres)

No painel do Supabase → **Project Settings → Database → Connection string**, copie:

- **Transaction pooler** (porta `6543`) → variável `DATABASE_URL` (usada pelo app em runtime)
- **Direct connection** (porta `5432`) → variável `DIRECT_URL` (usada pelo Prisma CLI para `db push`/migrations)

Cole as duas no `.env` local, depois rode:

```bash
npm run db:push              # cria as tabelas no Postgres
npm run db:import-postgres   # importa o backup local (prisma/data-export.json) com os dados reais
```

## 2. Variáveis de ambiente (Vercel)

Configure em Vercel → Project Settings → Environment Variables:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string pooled do Supabase (porta 6543) |
| `DIRECT_URL` | connection string direta do Supabase (porta 5432) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SECRET_KEY` | chave secreta do Supabase (Storage — fotos de receitas) |
| `RESEND_API_KEY` | API key do Resend (opcional — sem ela, envio de formulário fica em modo de teste/log) |
| `EMAIL_FROM` | remetente do e-mail, ex: `NutriKanban <onboarding@resend.dev>` |
| `NEXT_PUBLIC_APP_URL` | URL pública do site em produção, ex: `https://seu-projeto.vercel.app` |

## 3. Deploy

Conectar o repositório GitHub (`tedescobruno2-maker/nutri-o`) ao Vercel — framework Next.js é detectado automaticamente, nenhuma configuração extra de build é necessária.

## Observações

- O upload de fotos de receitas usa o Supabase Storage quando `SUPABASE_URL`/`SUPABASE_SECRET_KEY` estão configurados (bucket `uploads`, criado automaticamente no primeiro upload). Sem essas variáveis, cai em modo de desenvolvimento local (grava em `public/uploads`, que **não persiste** em produção serverless).
- A pasta `PACIENTES/` (documentos originais dos pacientes) e o arquivo `prisma/data-export.json` (backup dos dados reais) nunca são commitados — ficam só na máquina local (ver `.gitignore`).
