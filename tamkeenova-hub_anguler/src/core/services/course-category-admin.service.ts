import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CourseCategory, CourseCatalogResponse } from '../models/course-catalog.model';
import { CourseCatalogService } from './course-catalog.service';
export interface ManagedCategory extends CourseCategory {
  is_active: boolean;
  display_order: number;
  _count: { children: number; course_links: number; learning_programs: number };
}
export interface CategoryDraft {
  name_ar: string;
  name_en: string;
  slug: string;
  description_ar: string;
  description_en: string;
  image_url: string | null;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}
@Injectable({ providedIn: 'root' })
export class CourseCategoryAdminService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CourseCatalogService);
  private readonly url = `${environment.apiUrl}/admin/course-categories`;
  list() {
    return this.http
      .get<CourseCatalogResponse<ManagedCategory[]>>(this.url)
      .pipe(map((r) => r.data));
  }
  save(draft: CategoryDraft, id?: string) {
    const call = id ? this.http.put(`${this.url}/${id}`, draft) : this.http.post(this.url, draft);
    return call.pipe(tap(() => this.catalog.refreshCategories()));
  }
  visibility(row: ManagedCategory) {
    return this.http
      .patch(`${this.url}/${row.id}/visibility`, { is_active: !row.is_active })
      .pipe(tap(() => this.catalog.refreshCategories()));
  }
  remove(id: string) {
    return this.http.delete(`${this.url}/${id}`).pipe(tap(() => this.catalog.refreshCategories()));
  }
  upload(file: File) {
    const data = new FormData();
    data.append('image', file);
    return this.http
      .post<CourseCatalogResponse<{ image_url: string }>>(`${this.url}/image`, data)
      .pipe(map((r) => r.data.image_url));
  }
}
