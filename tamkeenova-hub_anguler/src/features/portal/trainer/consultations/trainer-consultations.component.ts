import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Consultation, ConsultationStatus } from '../../../../core/models/student.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-trainer-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, RouterLink],
  templateUrl: './trainer-consultations.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-consultations.component.css'],
})
export class TrainerConsultationsComponent implements OnInit {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/consultations`;
  private translate = inject(TranslateService);
  private router = inject(Router);

  isLoading = signal(true);
  hasLoaded = signal(false);
  consultations = signal<Consultation[]>([]);
  activeFilter = signal<ConsultationStatus | 'ALL'>('ALL');

  selected = signal<Consultation | null>(null);
  loadingDetails = signal(false);
  isUpdating = signal(false);
  updateError = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  action = signal<'APPROVE' | 'REJECT' | 'SCHEDULE' | 'COMPLETE' | 'CANCEL'>('APPROVE');
  trainerNotes = signal('');
  rejectionReason = signal('');
  scheduledAt = signal('');

  statuses: Array<ConsultationStatus | 'ALL'> = ['ALL', 'PENDING', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.consultations();
    if (f === 'ALL') return list;
    return list.filter((c) => c.status === f);
  });

  get isArabic(): boolean {
    return this.translate.currentLang() !== 'en';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    let params = new HttpParams();
    const f = this.activeFilter();
    if (f !== 'ALL') params = params.set('status', f);

    // جرب عدة endpoints لتجنب الفراغ حتى لو الـ API مختلف
    const endpoints = [
      `${this.baseUrl}/trainer/all`,
      `${this.baseUrl}/trainer`,
      `${this.baseUrl}`,
      `${environment.apiUrl}/trainers/consultations`,
    ];

    this.tryEndpoints(endpoints, 0, params);
  }

  private tryEndpoints(endpoints: string[], index: number, params: HttpParams): void {
    if (index >= endpoints.length) {
      this.isLoading.set(false);
      this.hasLoaded.set(true);
      return;
    }

    this.http.get<any>(endpoints[index], { params }).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        const list = Array.isArray(data) ? data : data?.data ?? [];
        if (list.length > 0 || index === endpoints.length - 1) {
          this.consultations.set(list);
          this.isLoading.set(false);
          this.hasLoaded.set(true);
        } else {
          // جرب الـ endpoint التالي لو فاضي
          this.tryEndpoints(endpoints, index + 1, params);
        }
      },
      error: (err) => {
        console.warn(`Endpoint ${endpoints[index]} failed`, err?.status);
        this.tryEndpoints(endpoints, index + 1, params);
      },
    });
  }

  setFilter(s: ConsultationStatus | 'ALL'): void {
    this.activeFilter.set(s);
    this.load();
  }

  openDetails(c: Consultation): void {
    this.selected.set(c);
    this.loadingDetails.set(true);
    this.updateError.set(null);
    this.action.set('APPROVE');
    this.trainerNotes.set('');
    this.rejectionReason.set('');
    this.scheduledAt.set('');

    this.http.get<any>(`${this.baseUrl}/${c.id}`).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.selected.set(data as Consultation);
        this.loadingDetails.set(false);
      },
      error: () => this.loadingDetails.set(false),
    });
  }

  closeDetails(): void {
    this.selected.set(null);
    this.updateError.set(null);
  }

  goToStudentProfile(): void {
    const sel = this.selected();
    if (!sel) return;
    const user: any = sel.users ?? (sel as any).student ?? (sel as any).user;
    const username = user?.username;
    const id = user?.id;
    if (username) {
      this.router.navigate(['/u', username]);
    } else if (id) {
      this.router.navigate(['/u', id]);
    }
  }

  allowedActions(status: ConsultationStatus): Array<{ value: string; label: string; icon: string }> {
    switch (status) {
      case 'PENDING':
        return [
          { value: 'APPROVE', label: 'موافقة', icon: 'fa-check' },
          { value: 'REJECT', label: 'رفض', icon: 'fa-xmark' },
        ];
      case 'APPROVED':
        return [
          { value: 'SCHEDULE', label: 'تحديد موعد', icon: 'fa-calendar' },
          { value: 'CANCEL', label: 'إلغاء', icon: 'fa-ban' },
        ];
      case 'SCHEDULED':
        return [
          { value: 'COMPLETE', label: 'إتمام', icon: 'fa-check-double' },
          { value: 'CANCEL', label: 'إلغاء', icon: 'fa-ban' },
        ];
      default:
        return [];
    }
  }

  updateStatus(): void {
    const sel = this.selected();
    if (!sel || this.isUpdating()) return;

    const act = this.action();
    if (act === 'REJECT' && !this.rejectionReason().trim()) {
      this.updateError.set('سبب الرفض مطلوب');
      return;
    }
    if (act === 'SCHEDULE' && !this.scheduledAt().trim()) {
      this.updateError.set('الموعد مطلوب');
      return;
    }

    this.isUpdating.set(true);
    this.updateError.set(null);

    const statusMap: Record<string, ConsultationStatus> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      SCHEDULE: 'SCHEDULED',
      COMPLETE: 'COMPLETED',
      CANCEL: 'CANCELLED',
    };

    const payload: any = {
      status: statusMap[act] ?? act,
      trainer_notes: this.trainerNotes().trim() || undefined,
      rejection_reason: this.rejectionReason().trim() || undefined,
      reason: this.rejectionReason().trim() || undefined,
      scheduled_at: this.scheduledAt().trim() ? new Date(this.scheduledAt()).toISOString() : undefined,
      action: act,
    };

    // جرب endpoint الأساسي ثم fallback
    this.http.patch<any>(`${this.baseUrl}/${sel.id}/status`, payload).subscribe({
      next: (res) => this.handleUpdateSuccess(res, sel),
      error: (err) => {
        if (err?.status === 404) {
          this.http.patch<any>(`${this.baseUrl}/${sel.id}`, { status: statusMap[act] ?? act, trainer_notes: payload.trainer_notes, rejection_reason: payload.rejection_reason, scheduled_at: payload.scheduled_at }).subscribe({
            next: (res2) => this.handleUpdateSuccess(res2, sel),
            error: (err2) => this.handleUpdateError(err2),
          });
        } else {
          this.handleUpdateError(err);
        }
      },
    });
  }

  private handleUpdateSuccess(res: any, sel: Consultation): void {
    this.isUpdating.set(false);
    const updated = res?.consultation ?? res?.data ?? res;
    this.consultations.update((list) => list.map((c) => (c.id === sel.id ? { ...c, ...updated } : c)));
    this.selected.set({ ...sel, ...updated });
    this.showToast('trainer_consultations.status_updated');
  }

  private handleUpdateError(err: any): void {
    this.isUpdating.set(false);
    this.updateError.set(apiErrorKey(err, 'trainer_consultations.update_error'));
  }

  badgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'badge badge-pending';
      case 'APPROVED':
      case 'SCHEDULED':
      case 'COMPLETED':
        return 'badge badge-approved';
      case 'REJECTED':
      case 'CANCELLED':
        return 'badge badge-rejected';
      default:
        return 'badge';
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}
