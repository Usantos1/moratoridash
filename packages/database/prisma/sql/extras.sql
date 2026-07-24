-- Constraints e triggers extras (aplicados após migrate Prisma)
-- Arquivo de referência; a migration inicial também embute estes trechos.

-- CHECK de e-mail (espelha validação do front)
ALTER TABLE qualification_leads
  DROP CONSTRAINT IF EXISTS qualification_leads_email_check;

ALTER TABLE qualification_leads
  ADD CONSTRAINT qualification_leads_email_check
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- revenue_level permitido (inclui legados)
ALTER TABLE qualification_leads
  DROP CONSTRAINT IF EXISTS qualification_leads_revenue_level_check;

ALTER TABLE qualification_leads
  ADD CONSTRAINT qualification_leads_revenue_level_check
  CHECK (
    revenue_level IS NULL OR revenue_level IN (
      'de_10_25','de_25_50','de_50_100','de_100_250','de_250_500','de_500_1m','acima_1m',
      'baixo','ate_25k','medio','alto','muito_alto','premium'
    )
  );

-- Índice parcial de completed_at
CREATE INDEX IF NOT EXISTS qualification_leads_completed_at_partial_idx
  ON qualification_leads (completed_at)
  WHERE completed_at IS NOT NULL;

-- Anti-duplicidade: não permite concluir 2x o mesmo e-mail OU telefone
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

DROP TRIGGER IF EXISTS trg_prevent_duplicate_qualification_completion ON qualification_leads;

CREATE TRIGGER trg_prevent_duplicate_qualification_completion
  BEFORE INSERT OR UPDATE OF completed_at, email, phone
  ON qualification_leads
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_qualification_completion();
