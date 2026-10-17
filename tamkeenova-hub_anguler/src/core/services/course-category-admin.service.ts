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
export class InvalidCategoryListResponse extends Error {
  constructor() {
    super('The category API returned an incompatible response.');
  }
}

@Injectable({ providedIn: 'root' })
export class CourseCategoryAdminService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CourseCatalogService);
  readonly endpoint = `${environment.apiUrl}/admin/course-categories`;
  list() {
    return this.http.get<CourseCatalogResponse<ManagedCategory[]>>(this.endpoint).pipe(
      map((r) => {

        if (
          !Array.isArray(r?.data) ||
          r.data.some(
            (row) =>
              !row ||
              typeof row.id !== 'string' ||
              typeof row.name_ar !== 'string' ||
              typeof row.name_en !== 'string' ||
              typeof row.is_active !== 'boolean' ||
              !row._count ||
              !['children', 'course_links', 'learning_programs'].every((key) => {
                const count = row._count[key as keyof ManagedCategory['_count']];
                return Number.isInteger(count) && count >= 0;
              }),
          )
        )
          throw new InvalidCategoryListResponse();
        return r.data;
      }),
    );
  }
  save(draft: CategoryDraft, id?: string) {
    const call = id
      ? this.http.put(`${this.endpoint}/${id}`, draft)
      : this.http.post(this.endpoint, draft);
    return call.pipe(tap(() => this.catalog.refreshCategories()));
  }
  visibility(row: ManagedCategory) {
    return this.http
      .patch(`${this.endpoint}/${row.id}/visibility`, { is_active: !row.is_active })
      .pipe(tap(() => this.catalog.refreshCategories()));
  }
  remove(id: string) {
    return this.http
      .delete(`${this.endpoint}/${id}`)
      .pipe(tap(() => this.catalog.refreshCategories()));
  }
  upload(file: File) {
    const data = new FormData();
    data.append('image', file);
    return this.http
      .post<CourseCatalogResponse<{ image_url: string }>>(`${this.endpoint}/image`, data)
      .pipe(map((r) => r.data.image_url));
  }
}
