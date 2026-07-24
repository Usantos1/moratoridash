-- Logo do cliente no workspace (miniatura no seletor)
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
