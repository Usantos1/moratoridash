-- Multi-tenant: workspaces, cargos e permissões + backfill dos dados existentes.

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE INDEX "workspaces_active_idx" ON "workspaces"("active");

-- CreateTable
CREATE TABLE "workspace_roles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(240),
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_roles_workspace_id_slug_key" ON "workspace_roles"("workspace_id", "slug");
CREATE INDEX "workspace_roles_workspace_id_sort_order_idx" ON "workspace_roles"("workspace_id", "sort_order");

ALTER TABLE "workspace_roles" ADD CONSTRAINT "workspace_roles_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "workspace_memberships" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workspace_memberships_workspace_id_user_id_key" ON "workspace_memberships"("workspace_id", "user_id");
CREATE INDEX "workspace_memberships_user_id_idx" ON "workspace_memberships"("user_id");
CREATE INDEX "workspace_memberships_workspace_id_active_idx" ON "workspace_memberships"("workspace_id", "active");

ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "workspace_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Workspace inicial com os dados de produção
INSERT INTO "workspaces" ("id", "slug", "name", "active", "settings", "created_at", "updated_at")
VALUES ('wsmuratori0000000000000000', 'muratori', 'Muratori', true, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Cargos padrão
INSERT INTO "workspace_roles" ("id", "workspace_id", "slug", "name", "description", "permissions", "is_system", "sort_order", "created_at", "updated_at")
VALUES
  ('wsrolemuratoriowner000000', 'wsmuratori0000000000000000', 'owner', 'Owner', 'Acesso total ao workspace', ARRAY['workspace.manage','users.manage','roles.manage','forms.read','forms.write','forms.publish','forms.delete','leads.read','leads.delete','leads.export','settings.read','settings.write','domains.manage','legacy.access']::TEXT[], true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wsrolemuratoriadmin000000', 'wsmuratori0000000000000000', 'admin', 'Administrador', 'Gerencia formulários, leads e usuários', ARRAY['users.manage','forms.read','forms.write','forms.publish','forms.delete','leads.read','leads.delete','leads.export','settings.read','settings.write','domains.manage','legacy.access']::TEXT[], true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wsrolemuratorieditor00000', 'wsmuratori0000000000000000', 'editor', 'Editor', 'Cria e publica formulários', ARRAY['forms.read','forms.write','forms.publish','leads.read','settings.read']::TEXT[], true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wsrolemuratoricomercial00', 'wsmuratori0000000000000000', 'comercial', 'Comercial', 'Trabalha os leads recebidos', ARRAY['forms.read','leads.read','leads.export']::TEXT[], true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('wsrolemuratorileitor00000', 'wsmuratori0000000000000000', 'leitor', 'Leitor', 'Somente leitura', ARRAY['forms.read','leads.read','settings.read']::TEXT[], true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("workspace_id", "slug") DO NOTHING;

-- Usuários existentes viram superadmin da plataforma + owner do workspace Muratori
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'member';
UPDATE "admin_users" SET "role" = 'superadmin' WHERE "role" IN ('owner', 'admin');

INSERT INTO "workspace_memberships" ("id", "workspace_id", "user_id", "role_id", "active", "created_at", "updated_at")
SELECT md5(random()::text || u."id"::text), 'wsmuratori0000000000000000', u."id", 'wsrolemuratoriowner000000', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "admin_users" u
ON CONFLICT ("workspace_id", "user_id") DO NOTHING;

-- ---------------------------------------------------------------------------
-- settings: uma linha por workspace
-- ---------------------------------------------------------------------------
DELETE FROM "settings" s
WHERE s."id" <> (SELECT s2."id" FROM "settings" s2 ORDER BY s2."updated_at" DESC, s2."created_at" DESC LIMIT 1);

ALTER TABLE "settings" ADD COLUMN "workspace_id" TEXT;
UPDATE "settings" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "settings" ALTER COLUMN "workspace_id" SET NOT NULL;
CREATE UNIQUE INDEX "settings_workspace_id_key" ON "settings"("workspace_id");
ALTER TABLE "settings" ADD CONSTRAINT "settings_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- qualification_leads
-- ---------------------------------------------------------------------------
ALTER TABLE "qualification_leads" ADD COLUMN "workspace_id" TEXT;
UPDATE "qualification_leads" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "qualification_leads" ALTER COLUMN "workspace_id" SET NOT NULL;
CREATE INDEX "qualification_leads_workspace_id_created_at_idx" ON "qualification_leads"("workspace_id", "created_at" DESC);
ALTER TABLE "qualification_leads" ADD CONSTRAINT "qualification_leads_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dedupe de diagnóstico agora é por workspace
CREATE OR REPLACE FUNCTION prevent_duplicate_qualification_completion()
RETURNS TRIGGER AS $$
DECLARE
  normalized_email TEXT;
  normalized_phone TEXT;
  conflict_id UUID;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  normalized_email := lower(trim(NEW.email));
  normalized_phone := regexp_replace(NEW.phone, '\D', '', 'g');

  SELECT id INTO conflict_id
  FROM qualification_leads
  WHERE completed_at IS NOT NULL
    AND id <> NEW.id
    AND workspace_id = NEW.workspace_id
    AND (
      lower(trim(email)) = normalized_email
      OR regexp_replace(phone, '\D', '', 'g') = normalized_phone
    )
  LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Diagnostico ja preenchido para este email ou telefone'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- lead_whatsapp_config
-- ---------------------------------------------------------------------------
ALTER TABLE "lead_whatsapp_config" ADD COLUMN "workspace_id" TEXT;
UPDATE "lead_whatsapp_config" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "lead_whatsapp_config" ALTER COLUMN "workspace_id" SET NOT NULL;
DROP INDEX IF EXISTS "lead_whatsapp_config_active_idx";
CREATE INDEX "lead_whatsapp_config_workspace_id_active_idx" ON "lead_whatsapp_config"("workspace_id", "active");
ALTER TABLE "lead_whatsapp_config" ADD CONSTRAINT "lead_whatsapp_config_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- diagnostic_page_config: slug passa a ser único por workspace
-- ---------------------------------------------------------------------------
ALTER TABLE "diagnostic_page_config" ADD COLUMN "workspace_id" TEXT;
UPDATE "diagnostic_page_config" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "diagnostic_page_config" ALTER COLUMN "workspace_id" SET NOT NULL;
DROP INDEX IF EXISTS "diagnostic_page_config_slug_key";
DROP INDEX IF EXISTS "diagnostic_page_config_active_idx";
CREATE UNIQUE INDEX "diagnostic_page_config_workspace_id_slug_key" ON "diagnostic_page_config"("workspace_id", "slug");
CREATE INDEX "diagnostic_page_config_workspace_id_active_idx" ON "diagnostic_page_config"("workspace_id", "active");
ALTER TABLE "diagnostic_page_config" ADD CONSTRAINT "diagnostic_page_config_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- diagnostic_flows
-- ---------------------------------------------------------------------------
ALTER TABLE "diagnostic_flows" ADD COLUMN "workspace_id" TEXT;
UPDATE "diagnostic_flows" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "diagnostic_flows" ALTER COLUMN "workspace_id" SET NOT NULL;
DROP INDEX IF EXISTS "diagnostic_flows_name_version_key";
CREATE UNIQUE INDEX "diagnostic_flows_workspace_id_name_version_key" ON "diagnostic_flows"("workspace_id", "name", "version");
ALTER TABLE "diagnostic_flows" ADD CONSTRAINT "diagnostic_flows_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- diagnostic_offers
-- ---------------------------------------------------------------------------
ALTER TABLE "diagnostic_offers" ADD COLUMN "workspace_id" TEXT;
UPDATE "diagnostic_offers" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "diagnostic_offers" ALTER COLUMN "workspace_id" SET NOT NULL;
CREATE INDEX "diagnostic_offers_workspace_id_active_idx" ON "diagnostic_offers"("workspace_id", "active");
ALTER TABLE "diagnostic_offers" ADD CONSTRAINT "diagnostic_offers_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- smart_forms: organization_id -> workspace_id com FK
-- ---------------------------------------------------------------------------
ALTER TABLE "smart_forms" RENAME COLUMN "organization_id" TO "workspace_id";
ALTER TABLE "smart_forms" ALTER COLUMN "workspace_id" DROP DEFAULT;
UPDATE "smart_forms" SET "workspace_id" = 'wsmuratori0000000000000000';
DROP INDEX IF EXISTS "smart_forms_organization_id_slug_key";
DROP INDEX IF EXISTS "smart_forms_organization_id_status_deleted_at_idx";
CREATE UNIQUE INDEX "smart_forms_workspace_id_slug_key" ON "smart_forms"("workspace_id", "slug");
CREATE INDEX "smart_forms_workspace_id_status_deleted_at_idx" ON "smart_forms"("workspace_id", "status", "deleted_at");
ALTER TABLE "smart_forms" ADD CONSTRAINT "smart_forms_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- smart_form_templates: organization_id -> workspace_id (null = global)
-- ---------------------------------------------------------------------------
ALTER TABLE "smart_form_templates" RENAME COLUMN "organization_id" TO "workspace_id";
UPDATE "smart_form_templates" SET "workspace_id" = NULL WHERE "workspace_id" = 'muratori';
DROP INDEX IF EXISTS "smart_form_templates_organization_id_slug_key";
CREATE UNIQUE INDEX "smart_form_templates_workspace_id_slug_key" ON "smart_form_templates"("workspace_id", "slug");
ALTER TABLE "smart_form_templates" ADD CONSTRAINT "smart_form_templates_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- smart_form_domains
-- ---------------------------------------------------------------------------
ALTER TABLE "smart_form_domains" ADD COLUMN "workspace_id" TEXT;
UPDATE "smart_form_domains" SET "workspace_id" = 'wsmuratori0000000000000000' WHERE "workspace_id" IS NULL;
ALTER TABLE "smart_form_domains" ALTER COLUMN "workspace_id" SET NOT NULL;
CREATE INDEX "smart_form_domains_workspace_id_idx" ON "smart_form_domains"("workspace_id");
