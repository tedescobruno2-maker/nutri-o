# Deploy — Nutri Luana Gois

## 1. Banco de dados (Supabase Postgres)

No painel do Supabase → botão **Connect** (topo do dashboard) → aba **Connection string**, copie:

- **Transaction pooler** (porta `6543`) → variável `DATABASE_URL` (usada pelo app em runtime)
- **Session pooler** (porta `5432`) → variável `DIRECT_URL` (usada pelo Prisma CLI para `db push`/migrations)

> Usamos o **Session pooler** em vez da "Direct connection" porque a conexão direta do Supabase é IPv6-only por padrão — em redes/ambientes só-IPv4 (comum em casa e em alguns runtimes) ela não conecta. O Session pooler resolve isso (é a alternativa oficial recomendada pelo próprio Supabase pra IPv4).

Cole as duas no `.env` local, depois rode:

```bash
npm run db:deploy            # aplica as migrações versionadas (prisma/migrations) no Postgres
npm run db:import-postgres   # importa o backup local (prisma/data-export.json) com os dados reais
```

### Migrações (a partir da Fase 0 do plano mestre)

O projeto usa **migrações versionadas** (`prisma/migrations/`) em vez de `db push`. Isso existe porque
há dados reais de paciente em produção — `db push` não gera histórico nem permite reverter uma
alteração de schema com segurança.

- **`npm run db:migrate`** (`prisma migrate dev`) — cria uma nova migração a partir de uma mudança no
  `schema.prisma` e já aplica no banco apontado por `DIRECT_URL`. Use em desenvolvimento.
- **`npm run db:deploy`** (`prisma migrate deploy`) — aplica migrações pendentes sem gerar novas.
  Use em produção/CI.
- **`npm run db:push`** (`prisma db push`) continua existindo por compatibilidade, mas **não deve
  mais ser usado** — ele não registra migração e pode dessincronizar o histórico. Antes de mudar o
  schema, exporte o banco (`npm run db:export-backup -- prisma/data-export-<fase>.json`).
- Colunas obrigatórias novas em tabela com dados existentes precisam de três passos (três
  migrações separadas): adicionar a coluna como opcional → preencher (backfill) os valores → só
  então tornar obrigatória.

## 2. Variáveis de ambiente (Vercel)

Configure em Vercel → Project Settings → Environment Variables:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Transaction pooler do Supabase (porta 6543) |
| `DIRECT_URL` | Session pooler do Supabase (porta 5432) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SECRET_KEY` | chave secreta do Supabase (Storage — fotos de receitas/alimentos/exames) |
| `RESEND_API_KEY` | API key do Resend (opcional — sem ela, envio de formulário fica em modo de teste/log) |
| `EMAIL_FROM` | remetente do e-mail, ex: `Nutri Luana Gois <onboarding@resend.dev>` |
| `NEXT_PUBLIC_APP_URL` | URL pública do site em produção, ex: `https://seu-projeto.vercel.app` |
| `GEMINI_API_KEY` | API key do Google Gemini — usada para importar dados da balança e resultados de exames em PDF via IA, e para sugerir dados nutricionais ao cadastrar um alimento novo. Sem ela, esses botões mostram "GEMINI_API_KEY não configurada no servidor". |
| `PIXABAY_API_KEY` | API key gratuita do Pixabay (opcional — cadastre-se em pixabay.com/api/docs) — usada apenas pelo botão "Preencher com IA" no cadastro de alimentos, para buscar automaticamente uma foto. Sem ela, a IA ainda sugere os valores nutricionais normalmente, só não busca a foto. |

> **Importante:** o `.env` local nunca é commitado (está no `.gitignore`) — as variáveis precisam ser cadastradas manualmente em Vercel → Project Settings → Environment Variables (copie os mesmos valores do `.env` local). Depois de adicionar/alterar uma variável, é preciso fazer um novo deploy (ou "Redeploy" no painel da Vercel) para ela entrar em vigor.

### Login (a partir da Fase 1 do plano mestre)

O antigo `APP_PASSWORD` (senha única em variável de ambiente) foi **removido**. O sistema agora tem
contas reais (`User`) com e-mail + senha (hash Argon2id via `@node-rs/argon2`) e sessão persistida em
banco (`Session`, token opaco em cookie `httpOnly`). A conta profissional (`ADMIN_MASTER`) exige
verificação em duas etapas (TOTP) — configurável em `/configuracoes/conta`. Não há mais nenhuma
variável de ambiente para "a senha do sistema"; o acesso é por conta.

`NEXT_PUBLIC_APP_URL` (acima) também é usada para montar o link de primeiro acesso enviado ao
paciente convidado ao portal (`/definir-senha/<token>`).

## 3. Deploy

Conectar o repositório GitHub (`tedescobruno2-maker/nutri-o`) ao Vercel — framework Next.js é detectado automaticamente, nenhuma configuração extra de build é necessária.

### Região (LGPD — dado de saúde de paciente brasileiro)

As Vercel Functions rodam por padrão em `iad1` (Washington, EUA) — sem configuração explícita, todo
o processamento de prontuário de saúde acontece nos Estados Unidos, o que é transferência
internacional de dado sensível (LGPD Art. 33) sem amparo claro. O arquivo `vercel.json` na raiz do
projeto fixa `"regions": ["gru1"]` (São Paulo) para as funções serverless.

> **Pendente (decisão do Bruno):** o banco de dados (Supabase) continua hospedado na região
> configurada quando o projeto foi criado — mudar a região de um projeto Supabase existente exige
> criar um projeto novo e reimportar os dados (janela de manutenção). Ver seção 9.2 do plano mestre.

### Storage — dois buckets, por sensibilidade

- **`public-assets`** (bucket público): fotos de alimentos, receitas e o logo da nutricionista. Não é
  dado pessoal, pode ficar acessível por URL direta.
- **`patient-docs`** (bucket privado): PDFs de exame e laudos importados. Nunca público — servido por
  **URL assinada de curta duração** (300s), gerada sob demanda em `actions/upload.ts` →
  `getSignedDocumentUrl`. O campo no banco (`Exam.fileUrl`, `ExamResult.sourceFileUrl`) guarda o
  **caminho do objeto**, não uma URL.

Sem `SUPABASE_URL`/`SUPABASE_SECRET_KEY` configurados, o upload cai em modo de desenvolvimento local
(grava em `public/uploads`, que **não persiste** em produção serverless).

## Observações

- A pasta `PACIENTES/` (documentos originais dos pacientes) e os arquivos `prisma/data-export*.json`
  (backups dos dados reais) nunca são commitados — ficam só na máquina local (ver `.gitignore`).
