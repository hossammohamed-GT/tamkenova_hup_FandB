import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateTaskPayload,
  MyTaskItem,
  ReviewPayload,
  Task,
  TaskAssignee,
  TaskComment,
  TaskStatus,
  TasksDashboardStats,
} from '../models/tasks.model';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/tasks`;

  // ==================== Admin ====================

  // -- Create a New Task (Admin) --
  create(payload: CreateTaskPayload): Observable<Task> {
    return this.unwrap(this.http.post<any>(this.baseUrl, payload));
  }

  // -- List All Tasks (Admin) --
  getAll(status?: TaskStatus | 'ALL'): Observable<Task[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.unwrap(
      this.http.get<any>(this.baseUrl, { params }).pipe(
        map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
      ),
    );
  }

  // -- Update a Task (Admin) --
  update(id: string, payload: Partial<CreateTaskPayload>): Observable<Task> {
    return this.unwrap(this.http.patch<any>(`${this.baseUrl}/${id}`, payload));
  }

  // -- Delete a Task (Admin) --
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // -- Add an Assignee to a Task (Admin) --
  addAssignee(taskId: string, user_id: string, task_order: number): Observable<TaskAssignee> {
    return this.unwrap(this.http.post<any>(`${this.baseUrl}/${taskId}/assignees`, { user_id, task_order }));
  }

  // -- Remove an Assignee from a Task (Admin) --
  removeAssignee(taskId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${taskId}/assignees/${userId}`);
  }

  // -- Review a Submission (Admin) --
  // Response is { success, message, assignee } — surface the refreshed assignee.
  review(assigneeId: string, payload: ReviewPayload): Observable<TaskAssignee> {
    return this.unwrap(
      this.http
        .patch<any>(`${this.baseUrl}/assignees/${assigneeId}/review`, payload)
        .pipe(map((res) => res?.assignee ?? res)),
    );
  }

  // -- Single Task Details (Admin/Member) --
  getById(taskId: string): Observable<Task> {
    return this.unwrap(this.http.get<any>(`${this.baseUrl}/${taskId}`));
  }

  // -- List Submissions of a Task (Admin) --
  getSubmissions(taskId: string): Observable<TaskAssignee[]> {
    return this.unwrap(
      this.http.get<any>(`${this.baseUrl}/${taskId}/submissions`).pipe(
        map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
      ),
    );
  }

  // ==================== Member (Employee / Volunteer) ====================

  // -- My Assigned Tasks --
  getMyTasks(): Observable<MyTaskItem[]> {
    return this.unwrap(
      this.http.get<any>(`${this.baseUrl}/my`).pipe(
        map((res) => {
          const body = Array.isArray(res) ? res : (res?.data ?? []);
          return Array.isArray(body) ? body : (body?.data ?? []);
        }),
      ),
    );
  }

  // API contract: task_id targets start/submit/comments/details.
  // The assignee id is ONLY used by the admin review endpoint (assignees/:id/review).

  // -- Start Working on a Task --
  start(taskId: string): Observable<unknown> {
    return this.unwrap(this.http.patch<any>(`${this.baseUrl}/${taskId}/start`, {}));
  }

  // -- Submit Task Deliverables (up to 10 files) --
  // With files -> multipart FormData (never set Content-Type manually);
  // text/link only -> JSON body per API contract.
  submit(taskId: string, content: string | null, linkUrl: string | null, files: File[]): Observable<unknown> {
    if (files.length > 0) {
      const fd = new FormData();
      if (content) fd.append('content', content);
      if (linkUrl) fd.append('link_url', linkUrl);
      for (const file of files) fd.append('files', file);
      return this.unwrap(this.http.post<any>(`${this.baseUrl}/${taskId}/submit`, fd));
    }
    const payload: Record<string, string> = {};
    if (content) payload['content'] = content;
    if (linkUrl) payload['link_url'] = linkUrl;
    return this.unwrap(this.http.post<any>(`${this.baseUrl}/${taskId}/submit`, payload));
  }

  // -- Task Comments --
  getComments(taskId: string): Observable<TaskComment[]> {
    return this.unwrap(
      this.http.get<any>(`${this.baseUrl}/${taskId}/comments`).pipe(
        map((res) => (Array.isArray(res) ? res : (res?.data ?? []))),
      ),
    );
  }

  // -- Add a Comment --
  addComment(taskId: string, body: string): Observable<TaskComment> {
    return this.unwrap(this.http.post<any>(`${this.baseUrl}/${taskId}/comments`, { body }));
  }

  // -- Tasks Dashboard (Employee / Volunteer) --
  getDashboard(): Observable<TasksDashboardStats> {
    return this.unwrap(this.http.get<any>(`${this.baseUrl}/dashboard`)).pipe(
      map((res: any) => (res?.data ?? res)),
    );
  }

  // ==================== Helpers ====================

  private unwrap(obs: Observable<any>): Observable<any> {
    return obs.pipe(map((res) => res?.data ?? res));
  }
}
