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
- [x] Multi-tenant: todo formulário pertence a um `Workspace` e as rotas admin exigem permissão

## Endpoints

Admin JWT — prefixo `/api/forms`  
Público — prefixo `/api/public/forms`  
Gestão de workspaces/cargos/membros — prefixo `/api/workspaces`

## Multi-tenant e permissões

Cada request admin identifica o workspace ativo pelo header `X-Workspace-Id` (ou `workspaceId` na
query, usado em downloads). O middleware valida a membership, carrega as permissões do cargo e
expõe `request.workspace`; recursos de outro workspace respondem 404 para não permitir enumeração.

Permissões: `workspace.manage`, `users.manage`, `roles.manage`, `forms.read/write/publish/delete`,
`leads.read/delete/export`, `settings.read/write`, `domains.manage`, `legacy.access`.

Usuários são globais e podem participar de vários workspaces com cargos diferentes. `role` no
`AdminUser` guarda apenas o papel de plataforma: `superadmin` acessa todos os workspaces e pode
criar novos; `member` depende de membership.
