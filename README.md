# Muratori Dash

Sistema operacional da agência **Muratori** — leads, diagnóstico conversacional, CRM e painel.

Stack da Fase 1:
- **API** Fastify + TypeScript (`apps/api`)
- **ORM** Prisma (`packages/database`)
- **Banco** PostgreSQL 16 (Docker local / nativo na VPS Hostinger KVM2)

## Estrutura

```
Muratori/
├── apps/api/                 # API REST
├── packages/database/        # Prisma schema + client + seed
├── docker-compose.yml        # Postgres local
├── .env.example
└── docs/deploy-hostinger.md  # Deploy na VPS
```

## Pré-requisitos

- Node.js 20+
- Docker Desktop (Postgres local)
- npm 10+

## Setup local (5 minutos)

> **Portas locais:** Postgres em `5433` e API em `3340` (evita conflito com outros serviços comuns na 5432/3333). Na VPS use `5432` e o que preferir atrás do Nginx.

```bash
# 1. Dependências
npm install

# 2. Ambiente
cp .env.example .env

# 3. Subir Postgres
npm run docker:up

# 4. Gerar client + migration
npm run db:generate
npm run db:migrate -- --name init

# 5. Seed (admin + config padrão)
npm run db:seed

# 6. API
npm run dev
```

Health checks:
- http://localhost:3340/health
- http://localhost:3340/health/db

## Scripts úteis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | API em watch mode |
| `npm run docker:up` | Sobe Postgres |
| `npm run db:studio` | Prisma Studio (GUI do banco) |
| `npm run db:migrate` | Nova migration em dev |
| `npm run db:migrate:deploy` | Aplica migrations (produção) |
| `npm run db:seed` | Dados iniciais |

## Fases do produto

| Fase | Escopo |
|------|--------|
| **1** | Base Prisma + Postgres + API + health + autosave de leads |
| **2 (agora)** | Formulário diagnóstico conversacional (chat WhatsApp) + página `/diagnostico` |
| **3** | Painel admin + auth + configs de página |
| **4** | Tracking, Meta/Google CAPI, pipeline de entrega |
| **5** | Flow builder + onboarding da marca |

## Produção (Hostinger KVM2)

Veja o guia completo: [docs/deploy-hostinger.md](./docs/deploy-hostinger.md)
