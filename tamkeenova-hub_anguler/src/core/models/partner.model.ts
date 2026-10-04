export interface StrategicPartner {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url: string;
  website_url?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
}
