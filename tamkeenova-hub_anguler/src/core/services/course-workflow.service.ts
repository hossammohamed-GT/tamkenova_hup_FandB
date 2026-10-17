import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StudentCertificate } from '../models/student.model';
import { environment } from '../../environments/environment';
export interface DraftLesson {
  description_ar?: string;
  description_en?: string;
  title_ar: string;
  title_en: string;
  media_url: string;
  duration_minutes: number;
  is_preview: boolean;
}
export interface DraftChapter {
  title_ar: string;
  title_en: string;
  lessons: DraftLesson[];
}
export interface CourseDraft {
  short_description_ar?: string;
  short_description_en?: string;
  content_type?: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  category_id: string;
  preview_video_url: string;
  cover_image_url: string;
  price: number;
  language: string;
  level: string;
  sections: DraftChapter[];
}
export interface WorkflowCourse {
  short_description_ar?: string;
  short_description_en?: string;
  content_type?: string;
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar?: string;
  description_en?: string;
  price: number | string;
  is_free: boolean;
  status: string;
  review_status: string;
  revision: number;
  review_note?: string;
  cover_image_url?: string;
  duration_minutes: number;
  lessons_count: number;
  owner?: { users: { full_name: string } };
  sections?: DraftChapter[];
  category_links?: { category_id: string }[];
  preview_video_url?: string;
  language?: string;
  level?: string;
}
export interface CheckoutSettings {
  enabled: boolean;
  vodafone_cash?: string | null;
  instapay?: string | null;
  instructions_ar?: string | null;
  instructions_en?: string | null;
}
export interface WorkflowEnrollment {
  id: string;
  course_id: string;
  status: string;
  progress: number;
  completion_state: string;
  completion_note?: string;
  recipient_name_ar?: string;
  recipient_name_en?: string;
  courses?: WorkflowCourse;
  users?: { full_name: string; email: string };
  lesson_progress?: { lesson_id: string }[];
  certificate?: StudentCertificate;
}
export interface Transfer {
  created_at?: string;
  id: string;
  course_id: string;
  status: string;
  method: string;
  recipient_account: string;
  expected_amount: number | string;
  reported_amount: number | string;
  sender_account: string;
  transferred_at: string;
  transfer_reference?: string;
  notes?: string;
  review_note?: string;
  confirmed_reference?: string;
  users?: { full_name: string; email: string };
  courses?: WorkflowCourse;
}
export interface Checkout {
  course: WorkflowCourse;
  enrollment: WorkflowEnrollment | null;
  requests: Transfer[];
  payment_enabled: boolean;
  methods: { method: string; account: string }[];
  instructions_ar?: string;
  instructions_en?: string;
  quote_token: string | null;
}
@Injectable({ providedIn: 'root' })
export class CourseWorkflowService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/course-workflow';
  trainerCourses() {
    return this.http.get<WorkflowCourse[]>(this.base + '/trainer/courses');
  }
  course(id: string, admin = false) {
    return this.http.get<WorkflowCourse>(
      `${this.base}/${admin ? 'admin' : 'trainer'}/courses/${id}`,
    );
  }
  saveCourse(payload: CourseDraft, id?: string) {
    return id
      ? this.http.put<WorkflowCourse>(`${this.base}/trainer/courses/${id}`, payload)
      : this.http.post<WorkflowCourse>(this.base + '/trainer/courses', payload);
  }
  submit(id: string) {
    return this.http.post(`${this.base}/trainer/courses/${id}/submit`, {});
  }
  completions() {
    return this.http.get<WorkflowEnrollment[]>(this.base + '/trainer/completions');
  }
  reviewCompletion(id: string, payload: object) {
    return this.http.post(`${this.base}/trainer/completions/${id}/review`, payload);
  }
  adminCourses(status: string) {
    return this.http.get<WorkflowCourse[]>(this.base + '/admin/courses', { params: { status } });
  }
  reviewCourse(course: WorkflowCourse, payload: object) {
    return this.http.post(`${this.base}/admin/courses/${course.id}/review`, {
      ...payload,
      revision: course.revision,
    });
  }
  payments(status: string) {
    return this.http.get<Transfer[]>(this.base + '/admin/payments', { params: { status } });
  }
  reviewPayment(id: string, payload: object) {
    return this.http.post(`${this.base}/admin/payments/${id}/review`, payload);
  }
  settings() {
    return this.http.get<CheckoutSettings>(this.base + '/admin/settings');
  }
  saveSettings(payload: CheckoutSettings) {
    const { enabled, vodafone_cash, instapay, instructions_ar, instructions_en } = payload;
    return this.http.put<CheckoutSettings>(this.base + '/admin/settings', {
      enabled,
      vodafone_cash,
      instapay,
      instructions_ar,
      instructions_en,
    });
  }
  checkout(id: string) {
    return this.http.get<Checkout>(`${this.base}/checkout/${id}`);
  }
  report(id: string, payload: object) {
    return this.http.post<Transfer>(`${this.base}/checkout/${id}/report`, payload);
  }
  enroll(id: string) {
    return this.http.post<WorkflowEnrollment>(`${this.base}/enroll/${id}/free`, {});
  }
  myPayments() {
    return this.http.get<Transfer[]>(this.base + '/library/payments');
  }
  library() {
    return this.http.get<WorkflowEnrollment[]>(this.base + '/library');
  }
  learning(id: string) {
    return this.http.get<WorkflowEnrollment>(`${this.base}/learning/${id}`);
  }
  mark(id: string, lessonId: string) {
    return this.http.post(`${this.base}/learning/${id}/lessons/${lessonId}/done`, {});
  }
  requestCompletion(id: string, payload: object) {
    return this.http.post(`${this.base}/learning/${id}/completion`, payload);
  }
}
export function workflowError(error: any): string {
  const message = error?.error?.message;
  return Array.isArray(message)
    ? message.join(' · ')
    : message || 'تعذّر إتمام الطلب. حاول مرة أخرى / Please retry.';
}

export function workflowStatus(value: string, english = false): string {
  const labels: Record<string, [string, string]> = {
    DRAFT: ['مسودة', 'Draft'],
    PENDING: ['بانتظار المراجعة', 'Awaiting review'],
    APPROVED: ['معتمد', 'Approved'],
    REJECTED: ['مرفوض', 'Rejected'],
    PUBLISHED: ['منشور', 'Published'],
    ACTIVE: ['متاح', 'Active'],
    COMPLETED: ['مكتمل', 'Completed'],
    CANCELLED: ['ملغي', 'Cancelled'],
    NOT_REQUESTED: ['لم يُطلب اعتماد الإتمام', 'Completion not requested'],
  };
  return labels[value]?.[english ? 1 : 0] ?? value;
}
