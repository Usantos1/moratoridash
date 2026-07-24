# Smart Forms — especificação técnica (Ativadash → Muratori Dash)

> Contrato técnico de dados, schema, APIs e regras de fluxo. Sem design visual.

Ver implementação em:

- `packages/database/prisma/schema.prisma` (models SmartForm*)
- `apps/api/src/smart-forms/` (engine + rotas)

## Checklist

- [x] Tabelas Form / Version / Session / Lead / LeadEvent / Template / Domain / AnalyticsDaily
- [x] CRUD + publish (snapshot imutável)
- [x] Definition schemaVersion 1 + validação Zod
- [x] Flow engine: nextNode, conditions, score, temperature, validate, mapTo
- [x] APIs públicas start/answer/resume/abandon + visitorKey 30d
- [x] settings theme/seo/tracking/webhook/chat
- [x] {{vars}} em textos e redirect
- [x] Pós-submit webhook (+ stubs CRM/Ads/IA)

## Endpoints

Admin JWT — prefixo `/api/forms`  
Público — prefixo `/api/public/forms`
