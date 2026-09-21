export interface Specialization {
  id: string;
  name_ar: string;
  name_en: string;
  created_at?: string;
}

export interface SpecializationRequestPayload {
  name_ar: string;
  name_en: string;
}

export interface SpecializationRequestResponse {
  id: string;
  user_id: string;
  name_ar: string;
  name_en: string;
  status: 'PENDING';
  created_at: string;
}
