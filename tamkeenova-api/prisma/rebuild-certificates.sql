-- Apply before deploying the new API. Additive: existing verification codes and
-- revocation states are preserved. NULL version identifies historical records;
-- Version 2026.1 rows keep NULL language and their original bilingual artwork.
-- Do not silently certify them under a new design or invent missing values.
BEGIN;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS recipient_name varchar(120);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS program_name varchar(180);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_version varchar(20);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_language varchar(2);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS partner_logos jsonb;
COMMIT;
