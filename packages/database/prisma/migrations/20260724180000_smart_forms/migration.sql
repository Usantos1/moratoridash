-- CreateEnum
CREATE TYPE "SmartFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SmartFormLeadTemperature" AS ENUM ('COLD', 'WARM', 'HOT', 'VERY_HOT');

-- CreateEnum
CREATE TYPE "SmartFormLeadStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "SmartFormDomainStatus" AS ENUM ('pending_dns', 'pending_ssl', 'active', 'error');

-- CreateTable
CREATE TABLE "smart_forms" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL DEFAULT 'muratori',
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "public_slug" VARCHAR(80) NOT NULL,
    "status" "SmartFormStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "draft_definition" JSONB NOT NULL DEFAULT '{}',
    "published_version_id" TEXT,
    "score_cold_max" INTEGER NOT NULL DEFAULT 24,
    "score_warm_max" INTEGER NOT NULL DEFAULT 49,
    "score_hot_max" INTEGER NOT NULL DEFAULT 74,
    "ai_system_prompt" TEXT,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT true,
    "crm_sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "smart_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_versions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "published_by_user_id" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(240),

    CONSTRAINT "smart_form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_sessions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "session_token" VARCHAR(64) NOT NULL,
    "status" "SmartFormLeadStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "current_node_id" VARCHAR(64),
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "ttclid" TEXT,
    "referrer" TEXT,
    "landing_page" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_type" VARCHAR(40),
    "os_name" VARCHAR(80),
    "browser_name" VARCHAR(80),
    "geo_city" TEXT,
    "geo_state" TEXT,
    "geo_country" TEXT,
    "visitor_key" VARCHAR(80),
    "completion_redirect_url" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "abandoned_at" TIMESTAMP(3),

    CONSTRAINT "smart_form_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_leads" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "status" "SmartFormLeadStatus" NOT NULL DEFAULT 'COMPLETED',
    "temperature" "SmartFormLeadTemperature" NOT NULL DEFAULT 'COLD',
    "score" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "full_name" VARCHAR(200),
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "company_name" VARCHAR(200),
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "ai_summary" JSONB,
    "ai_processed_at" TIMESTAMP(3),
    "ai_error" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "ttclid" TEXT,
    "referrer" TEXT,
    "landing_page" TEXT,
    "crm_contact_id" TEXT,
    "crm_synced_at" TIMESTAMP(3),
    "crm_sync_error" TEXT,
    "webhook_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_form_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_lead_events" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "event_type" VARCHAR(40) NOT NULL,
    "event_name" VARCHAR(120) NOT NULL,
    "node_id" VARCHAR(64),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smart_form_lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "category" VARCHAR(80),
    "definition" JSONB NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_domains" (
    "id" TEXT NOT NULL,
    "hostname" VARCHAR(255) NOT NULL,
    "status" "SmartFormDomainStatus" NOT NULL DEFAULT 'pending_dns',
    "form_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_form_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_form_analytics_daily" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "started" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "abandoned" INTEGER NOT NULL DEFAULT 0,
    "qualified" INTEGER NOT NULL DEFAULT 0,
    "disqualified" INTEGER NOT NULL DEFAULT 0,
    "breakdowns" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_form_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "smart_forms_public_slug_key" ON "smart_forms"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "smart_forms_published_version_id_key" ON "smart_forms"("published_version_id");

-- CreateIndex
CREATE INDEX "smart_forms_organization_id_status_deleted_at_idx" ON "smart_forms"("organization_id", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "smart_forms_organization_id_slug_key" ON "smart_forms"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "smart_form_versions_form_id_idx" ON "smart_form_versions"("form_id");

-- CreateIndex
CREATE UNIQUE INDEX "smart_form_versions_form_id_version_number_key" ON "smart_form_versions"("form_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "smart_form_sessions_session_token_key" ON "smart_form_sessions"("session_token");

-- CreateIndex
CREATE INDEX "smart_form_sessions_form_id_status_idx" ON "smart_form_sessions"("form_id", "status");

-- CreateIndex
CREATE INDEX "smart_form_sessions_visitor_key_idx" ON "smart_form_sessions"("visitor_key");

-- CreateIndex
CREATE UNIQUE INDEX "smart_form_leads_session_id_key" ON "smart_form_leads"("session_id");

-- CreateIndex
CREATE INDEX "smart_form_leads_form_id_created_at_idx" ON "smart_form_leads"("form_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "smart_form_leads_email_idx" ON "smart_form_leads"("email");

-- CreateIndex
CREATE INDEX "smart_form_leads_phone_idx" ON "smart_form_leads"("phone");

-- CreateIndex
CREATE INDEX "smart_form_leads_temperature_idx" ON "smart_form_leads"("temperature");

-- CreateIndex
CREATE INDEX "smart_form_lead_events_lead_id_created_at_idx" ON "smart_form_lead_events"("lead_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "smart_form_templates_is_active_sort_order_idx" ON "smart_form_templates"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "smart_form_templates_organization_id_slug_key" ON "smart_form_templates"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "smart_form_domains_hostname_key" ON "smart_form_domains"("hostname");

-- CreateIndex
CREATE INDEX "smart_form_domains_form_id_idx" ON "smart_form_domains"("form_id");

-- CreateIndex
CREATE UNIQUE INDEX "smart_form_analytics_daily_form_id_day_key" ON "smart_form_analytics_daily"("form_id", "day");

-- AddForeignKey
ALTER TABLE "smart_forms" ADD CONSTRAINT "smart_forms_published_version_id_fkey" FOREIGN KEY ("published_version_id") REFERENCES "smart_form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_versions" ADD CONSTRAINT "smart_form_versions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "smart_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_sessions" ADD CONSTRAINT "smart_form_sessions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "smart_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_leads" ADD CONSTRAINT "smart_form_leads_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "smart_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_leads" ADD CONSTRAINT "smart_form_leads_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "smart_form_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_lead_events" ADD CONSTRAINT "smart_form_lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "smart_form_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_domains" ADD CONSTRAINT "smart_form_domains_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "smart_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "smart_form_analytics_daily" ADD CONSTRAINT "smart_form_analytics_daily_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "smart_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
