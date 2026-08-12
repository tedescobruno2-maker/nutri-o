# NutriKanban — Plano de Implementação

## Objetivo
Sistema de acompanhamento nutricional para clientes: Kanban de status, banco de clientes,
gráficos de evolução e módulo de receitas.

## Stack Aprovada
- **Framework:** Next.js 15 (App Router) + TypeScript, front-end e back-end no mesmo projeto.
- **Estilização:** CSS puro (Vanilla CSS) com design premium — glassmorphism, dark/light mode, micro-animações. Sem Tailwind.
- **Banco de dados:** SQLite + Prisma ORM.
- **Gráficos:** Recharts.
- **Kanban:** `@dnd-kit/core` + `@dnd-kit/sortable`.

## Decisões de Escopo (respondidas pelo usuário)
- Colunas do Kanban: **Novos → Em Avaliação → Plano Entregue → Acompanhamento**.
- Gráficos no perfil do cliente: evolução de peso/medidas, adesão à dieta, distribuição de macronutrientes.
- Projeto inicializado na raiz de `Luana/` (diretório atual).

## Modelo de Dados (Prisma)
- `Client`: dados pessoais, objetivo, status do Kanban (enum), datas.
- `Measurement`: histórico de peso/medidas por cliente (1:N), usado nos gráficos de evolução.
- `DietLog`: registros de adesão à dieta por semana/data (1:N com Client), usado no gráfico de adesão.
- `Recipe`: nome, ingredientes, modo de preparo, calorias, macros (proteína/carbo/gordura).

## Estrutura de Diretórios
```
src/
  app/
    page.tsx                 # Dashboard
    kanban/page.tsx          # Quadro Kanban
    clients/page.tsx         # Lista de clientes
    clients/[id]/page.tsx    # Perfil + gráficos
    recipes/page.tsx         # Módulo de receitas
    api/
      clients/route.ts + [id]/route.ts
      measurements/route.ts
      recipes/route.ts
  components/
    ui/                      # Botões, cards, inputs reutilizáveis
    kanban/                  # Board, Column, Card (dnd-kit)
    charts/                  # WeightChart, AdherenceChart, MacroChart (Recharts)
    layout/                  # Sidebar, Topbar
  lib/
    db.ts                    # Prisma client singleton
    utils.ts
  types/
prisma/
  schema.prisma
  seed.ts
```

## Ordem de Execução
1. ✅ Plano criado (este arquivo) — checkpoint de verificação.
2. Scaffold do projeto Next.js + dependências (Prisma, dnd-kit, Recharts).
3. Schema Prisma + seed com dados de exemplo (SQLite).
4. Design system em `globals.css` (paleta, temas, glassmorphism, animações).
5. Layout base (sidebar/topbar) + Dashboard.
6. Kanban (drag-and-drop) ligado ao banco via Server Actions.
7. Banco de clientes (listagem + perfil individual com gráficos).
8. Módulo de receitas.
9. Verificação manual (dev server, navegação, drag-and-drop, gráficos).

## Verificação
- `npm run dev` sobe sem erros.
- Kanban permite arrastar cards entre colunas e persiste no SQLite.
- Página de cliente exibe os 3 gráficos com dados do seed.
- Receitas listam corretamente com macros.
