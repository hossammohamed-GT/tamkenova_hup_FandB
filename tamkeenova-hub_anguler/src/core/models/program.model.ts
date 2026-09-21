export type ProgramLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ProgramFormat = 'onsite' | 'online' | 'hybrid';

export interface Program {
  id: string;
  title: string;
  image_url?: string;
  short_description?: string;
  description?: string;
  price: number;
  discount_price?: number;
  duration_hours?: number;
  level: ProgramLevel;
  format?: ProgramFormat;
  is_open?: boolean;
  seats_left?: number;
  category?: string;
  trainer: {
    id: string;
    name: string;
    avatar: string | null;
    specialization: string;
  };
  average_rating?: number;
  enrollments_count?: number;
}
