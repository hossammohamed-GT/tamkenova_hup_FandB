import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { ConsultationService } from '../../../../core/services/consultation.service';
import { CorporateRequestService } from '../../../../core/services/corporate-request.service';
import { AppNotification, Consultation, CorporateRequest } from '../../../../core/models/student.model';
import {
  notificationIcon,
  notificationTone,
  notificationTypeKey,
  isKnownNotificationType,
} from '../../../../core/utils/notification-presentation';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-student-notifications',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './student-notifications.component.html',
  styleUrls: ['../../portal-shared.css', './student-notifications.component.css'],
})
export class StudentNotificationsComponent {
  private notificationsService = inject(NotificationsService);
  private consultationService = inject(ConsultationService);
  private corporateService = inject(CorporateRequestService);
  private translateService = inject(TranslateService);

  isLoading = signal(true);
  notifications = signal<AppNotification[]>([]);
  showUnreadOnly = signal(false);
  isMarkingAll = signal(false);

  // detail modal
  selectedNotification = signal<AppNotification | null>(null);
  notificationDetail = signal<Consultation | CorporateRequest | null>(null);
  isLoadingDetail = signal(false);
  showDetailModal = signal(false);

  unreadCount = this.notificationsService.unreadCount;

  filtered = computed(() => {
    const list = this.notifications();
    return this.showUnreadOnly() ? list.filter((n) => !n.is_read) : list;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.notificationsService.getAll().subscribe({
      next: (res) => {
        this.notifications.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  toggleUnreadOnly(): void {
    this.showUnreadOnly.update((v) => !v);
  }

  markAsRead(item: AppNotification): void {
    if (item.is_read) return;
    this.notificationsService.markAsRead(item.id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
        );
      },
      error: () => undefined,
    });
  }

  openDetails(item: AppNotification): void {
    this.selectedNotification.set(item);
    this.notificationDetail.set(null);
    this.isLoadingDetail.set(true);
    this.showDetailModal.set(true);

    if (!item.is_read) {
      this.markAsRead(item);
    }

    const refId = item.reference_id;
    const refType = (item.reference_type ?? item.type ?? '').toUpperCase();
    if (!refId) {
      this.isLoadingDetail.set(false);
      return;
    }

    if (refType.includes('CONSULTATION')) {
      this.consultationService.getById(refId).subscribe({
        next: (res) => {
          this.notificationDetail.set(res);
          this.isLoadingDetail.set(false);
        },
        error: () => this.isLoadingDetail.set(false),
      });
    } else if (refType.includes('CORPORATE')) {
      this.corporateService.getById(refId).subscribe({
        next: (res) => {
          this.notificationDetail.set(res);
          this.isLoadingDetail.set(false);
        },
        error: () => this.isLoadingDetail.set(false),
      });
    } else {
      // Trainer / volunteer / task / system notifications have no entity
      // endpoint — show the notification content itself instead of spinning.
      this.isLoadingDetail.set(false);
    }
  }

  closeDetails(): void {
    this.showDetailModal.set(false);
    this.selectedNotification.set(null);
    this.notificationDetail.set(null);
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0 || this.isMarkingAll()) return;
    this.isMarkingAll.set(true);
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, is_read: true })));
        this.isMarkingAll.set(false);
      },
      error: () => this.isMarkingAll.set(false),
    });
  }

  iconFor(type: string): string {
    return notificationIcon(type);
  }

  toneFor(type: string): string {
    return 'tone-' + notificationTone(type);
  }

  // Known types are ALWAYS shown in the user's language (the backend
  // currently sends English-only titles/messages).
  titleFor(notif: AppNotification): string {
    const key = notificationTypeKey(notif.type);
    const fullKey = 'notifications.types.' + key;
    if (isKnownNotificationType(notif.type) || !notif.title?.trim()) {
      const translated = this.translateService.instant(fullKey);
      if (translated !== fullKey) return translated;
    }
    return notif.title || '';
  }

  messageFor(notif: AppNotification): string {
    const key = notificationTypeKey(notif.type);
    const fullKey = 'notifications.types.' + key + '_msg';
    if (isKnownNotificationType(notif.type) || !notif.message?.trim()) {
      const translated = this.translateService.instant(fullKey);
      if (translated !== fullKey) return translated;
    }
    return notif.message || '';
  }

  typeKeyFor(type: string): string {
    return 'notifications.types.' + notificationTypeKey(type);
  }

  isConsultationDetail(detail: Consultation | CorporateRequest | null): detail is Consultation {
    return !!detail && 'title' in detail && 'status' in detail && !('company_name' in detail);
  }

  isCorporateDetail(detail: Consultation | CorporateRequest | null): detail is CorporateRequest {
    return !!detail && 'company_name' in detail;
  }
}
