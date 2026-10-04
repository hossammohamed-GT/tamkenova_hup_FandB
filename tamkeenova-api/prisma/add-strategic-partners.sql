CREATE TABLE IF NOT EXISTS strategic_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name_ar varchar(255) NOT NULL,
  name_en varchar(255) NOT NULL, logo_url text NOT NULL, website_url text,
  is_active boolean NOT NULL DEFAULT true, display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_strategic_partners_active_order ON strategic_partners (is_active, display_order);

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS partner_ids jsonb;

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS title_ar text, ADD COLUMN IF NOT EXISTS title_en text, ADD COLUMN IF NOT EXISTS description_ar text, ADD COLUMN IF NOT EXISTS description_en text;
