import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { Program, ProgramLevel } from '../models/program.model';

interface RawProgramsResponse {
  success: boolean;
  count: number;
  data: RawProgram[];
}

interface RawProgram {
  id: string;
  title: string;
  image_url: string | null;
  short_description: string | null;
  description: string | null;
  price: string;
  discount_price: string | null;
  duration_hours: number | null;
  level: ProgramLevel;
  is_active: boolean;
  trainers: {
    id: string;
    average_rating: string;
    total_students: number;
    users: {
      full_name: string;
      profile_image: string | null;
    };
    specializations: {
      name_ar: string;
      name_en: string;
    };
  };
}

@Injectable({ providedIn: 'root' })
export class ProgramsService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private baseUrl = `${environment.apiUrl}/trainers/programs`;

  getAllPublic(): Observable<Program[]> {
    return this.http
      .get<RawProgramsResponse>(`${this.baseUrl}/all`)
      .pipe(map((res) => (res.data ?? []).map((item) => this.mapProgram(item))));
  }

  private mapProgram(item: RawProgram): Program {
    const isArabic = this.translate.currentLang() !== 'en';
    const specialization = item.trainers
      ? isArabic
        ? item.trainers.specializations?.name_ar
        : item.trainers.specializations?.name_en
      : '';

    return {
      id: item.id,
      title: item.title,
      image_url: item.image_url ?? undefined,
      short_description: item.short_description ?? undefined,
      description: item.description ?? undefined,
      price: Number(item.price),
      discount_price: item.discount_price ? Number(item.discount_price) : undefined,
      duration_hours: item.duration_hours ?? undefined,
      level: item.level,
      is_open: item.is_active,
      trainer: {
        id: item.trainers?.id ?? '',
        name: item.trainers?.users?.full_name ?? '',
        avatar: item.trainers?.users?.profile_image ?? null,
        specialization: specialization ?? '',
      },
      average_rating: item.trainers?.average_rating
        ? Number(item.trainers.average_rating)
        : undefined,
      enrollments_count: item.trainers?.total_students ?? undefined,
    };
  }
}
