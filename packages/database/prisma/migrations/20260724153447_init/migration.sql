-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'converted', 'rejected');

-- CreateEnum
CREATE TYPE "ResponseTime" AS ENUM ('imediato', 'minutos', 'horas', 'dias');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'ignored');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "tracking" JSONB NOT NULL DEFAULT '{}',
    "whatsapp" JSONB NOT NULL DEFAULT '{}',
    "business" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_leads" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "number_of_attendants" INTEGER,
    "niches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clients_per_day" INTEGER,
    "revenue_level" TEXT,
    "response_time" "ResponseTime",
    "additional_info" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "segment" TEXT NOT NULL DEFAULT 'agencia_marketing',
    "flow_version" INTEGER,
    "page_config_id" UUID,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "completed_at" TIMESTAMP(3),
    "is_qualified" BOOLEAN,
    "qualification_score" INTEGER,
    "qualification_reasons" JSONB,
    "whatsapp_sent" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_sent_at" TIMESTAMP(3),
    "whatsapp_clicked" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_clicked_at" TIMESTAMP(3),
    "source_page" TEXT,
    "landing_url" TEXT,
    "referrer" TEXT,
    "hostname" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "gclid" TEXT,
    "gbraid" TEXT,
    "wbraid" TEXT,
    "fbclid" TEXT,
    "fbp" TEXT,
    "fbc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_whatsapp_config" (
    "id" UUID NOT NULL,
    "whatsapp_number" TEXT NOT NULL,
    "whatsapp_message_template" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_whatsapp_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_page_config" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "brand_name" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "checkout_url" TEXT,
    "whatsapp_number" TEXT,
    "whatsapp_message_template" TEXT,
    "qualification_rule" JSONB,
    "segment_preset" TEXT NOT NULL DEFAULT 'agencia_marketing',
    "gtm_id" TEXT,
    "ga4_measurement_id" TEXT,
    "google_ads_id" TEXT,
    "google_ads_conversion_label" TEXT,
    "meta_pixel_id" TEXT,
    "meta_access_token_secret_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_page_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_flows" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "definition" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_offers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "features" JSONB NOT NULL DEFAULT '[]',
    "checkout_url" TEXT NOT NULL,
    "rule" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnostic_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "destination" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "qualification_leads_status_idx" ON "qualification_leads"("status");

-- CreateIndex
CREATE INDEX "qualification_leads_created_at_idx" ON "qualification_leads"("created_at" DESC);

-- CreateIndex
CREATE INDEX "qualification_leads_email_idx" ON "qualification_leads"("email");

-- CreateIndex
CREATE INDEX "qualification_leads_phone_idx" ON "qualification_leads"("phone");

-- CreateIndex
CREATE INDEX "qualification_leads_whatsapp_sent_idx" ON "qualification_leads"("whatsapp_sent");

-- CreateIndex
CREATE INDEX "qualification_leads_completed_at_idx" ON "qualification_leads"("completed_at");

-- CreateIndex
CREATE INDEX "qualification_leads_segment_idx" ON "qualification_leads"("segment");

-- CreateIndex
CREATE INDEX "lead_whatsapp_config_active_idx" ON "lead_whatsapp_config"("active");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_page_config_slug_key" ON "diagnostic_page_config"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_page_config_domain_key" ON "diagnostic_page_config"("domain");

-- CreateIndex
CREATE INDEX "diagnostic_page_config_active_idx" ON "diagnostic_page_config"("active");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_flows_name_version_key" ON "diagnostic_flows"("name", "version");

-- CreateIndex
CREATE INDEX "delivery_logs_status_idx" ON "delivery_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_logs_lead_id_destination_event_name_key" ON "delivery_logs"("lead_id", "destination", "event_name");

-- AddForeignKey
ALTER TABLE "qualification_leads" ADD CONSTRAINT "qualification_leads_page_config_id_fkey" FOREIGN KEY ("page_config_id") REFERENCES "diagnostic_page_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "qualification_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
