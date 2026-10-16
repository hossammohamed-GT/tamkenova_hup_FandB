import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Course,
  CourseCatalogResponse,
  CourseCategory,
  CourseCollection,
  CourseListResponse,
  LearningProgram,
} from '../models/course-catalog.model';

export interface CourseCatalogQuery {
  search?: string;
  category?: string;
  level?: string;
  language?: string;
  content_type?: string;
  is_free?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CourseCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/courses`;

  // Shared between the eager navbar and Programs page; failed requests remain retryable.
  private readonly categories$ = this.http
      .get<CourseCatalogResponse<CourseCategory[]>>(`${this.baseUrl}/categories`)
      .pipe(map((response) => response.data ?? []), shareReplay({ bufferSize: 1, refCount: false }));

  getCategories(): Observable<CourseCategory[]> {
    return this.categories$;
  }

  getCollections(): Observable<CourseCollection[]> {
    return this.http
      .get<CourseCatalogResponse<CourseCollection[]>>(`${this.baseUrl}/collections`)
      .pipe(map((response) => response.data ?? []));
  }

  getLearningPrograms(): Observable<LearningProgram[]> {
    return this.http
      .get<CourseCatalogResponse<LearningProgram[]>>(`${this.baseUrl}/learning-programs`)
      .pipe(map((response) => response.data ?? []));
  }

  getCourses(query: CourseCatalogQuery = {}): Observable<CourseListResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<CourseListResponse>(this.baseUrl, { params });
  }

  getCourseBySlug(slug: string): Observable<Course> {
    return this.http
      .get<CourseCatalogResponse<Course>>(`${this.baseUrl}/${encodeURIComponent(slug)}`)
      .pipe(map((response) => response.data));
  }
}
