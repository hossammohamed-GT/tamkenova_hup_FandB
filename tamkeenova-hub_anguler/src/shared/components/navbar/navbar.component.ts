import { Component, HostListener, inject, signal, computed, ElementRef, effect } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service.js';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ConsultationService } from '../../../core/services/consultation.service';
import { CorporateRequestService } from '../../../core/services/corporate-request.service';
import { AppNotification, Consultation, CorporateRequest } from '../../../core/models/student.model';
import {
  notificationIcon,
  notificationTone,
  notificationTypeKey,
  isKnownNotificationType,
} from '../../../core/utils/notification-presentation';
import { TranslateService } from '@ngx-translate/core';

interface NavLink {
  labelKey: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private notificationsService = inject(NotificationsService);
  private consultationService = inject(ConsultationService);
  private corporateService = inject(CorporateRequestService);
  private translateService = inject(TranslateService);

  isScrolled = signal(false);
  isMobileMenuOpen = signal(false);
  isUserMenuOpen = signal(false);
  isNotifDropdownOpen = signal(false);
  isNotifHovering = signal(false);

  recentNotifications = signal<AppNotification[]>([]);
  isLoadingNotifications = signal(false);
  selectedNotification = signal<AppNotification | null>(null);
  notificationDetail = signal<Consultation | CorporateRequest | null>(null);
  isLoadingDetail = signal(false);
  showNotifDetailModal = signal(false);

  isDark = computed(() => this.themeService.theme() === 'dark');
  isArabic = computed(() => this.themeService.language() === 'ar');

  isLoggedIn = this.authService.isLoggedIn;
  currentUser = this.authService.currentUser;
  unreadCount = this.notificationsService.unreadCount;

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) {
        this.notificationsService.refreshUnreadCount();
      }
    });
  }

  userInitials = computed(() => {
    const name = this.currentUser()?.full_name ?? '';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

  userAvatar = computed(() => {
    const img = this.currentUser()?.profile_image;
    if (!img || (typeof img === 'string' && img.trim() === '')) return null;
    return img;
  });

  roleLabel = computed(() => {
    const role = this.authService.role();
    switch (role) {
      case 'TRAINER':
        return 'nav.role_trainer';
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'nav.role_admin';
      case 'EMPLOYEE':
        return 'nav.role_employee';
      case 'VOLUNTEER':
        return 'nav.role_volunteer';
      default:
        return 'nav.role_student';
    }
  });

  dashboardRoute = computed(() => {
    const role = this.authService.role();
    if (role === 'TRAINER') return '/portal/trainer';
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/portal/admin';
    if (role === 'EMPLOYEE') return '/portal/employee';
    if (role === 'VOLUNTEER') return '/portal/volunteer';
    return '/portal/student';
  });

  navLinks: NavLink[] = [
    { labelKey: 'nav.home', route: '/' },
    { labelKey: 'nav.programs', route: '/programs' },
    { labelKey: 'nav.portal', route: '/portal' },
    { labelKey: 'nav.consulting', route: '/consulting' },
    { labelKey: 'nav.team', route: '/team' },
    { labelKey: 'nav.gallery', route: '/gallery' },
  ];

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    this.isScrolled.set(window.scrollY > 24);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || typeof (target as any).closest !== 'function') {
      // text node or non-element click
      this.isUserMenuOpen.set(false);
      if (!this.isNotifHovering()) {
        this.isNotifDropdownOpen.set(false);
      }
      return;
    }
    const clickedInside = this.elementRef.nativeElement.contains(target);
    const isNotifArea = target.closest('.notif-dropdown-wrapper') || target.closest('.notif-glass-dropdown') || target.closest('.notif-detail-modal');
    if (!clickedInside && !isNotifArea) {
      this.isUserMenuOpen.set(false);
      if (!this.isNotifHovering()) {
        this.isNotifDropdownOpen.set(false);
      }
    }
    // also close user menu if clicked outside but inside navbar and not user menu
    if (clickedInside && this.isUserMenuOpen()) {
      const insideUserMenu = target.closest('.user-menu');
      if (!insideUserMenu) {
        this.isUserMenuOpen.set(false);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isUserMenuOpen.set(false);
    this.isNotifDropdownOpen.set(false);
    this.showNotifDetailModal.set(false);
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((v) => !v);
    if (this.isUserMenuOpen()) this.isNotifDropdownOpen.set(false);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  onNotifMouseEnter(): void {
    this.isNotifHovering.set(true);
    this.isNotifDropdownOpen.set(true);
    if (this.recentNotifications().length === 0 && !this.isLoadingNotifications()) {
      this.loadRecentNotifications();
    }
  }

  onNotifMouseLeave(): void {
    this.isNotifHovering.set(false);
    setTimeout(() => {
      if (!this.isNotifHovering()) {
        this.isNotifDropdownOpen.set(false);
      }
    }, 320);
  }

  onDropdownMouseEnter(): void {
    this.isNotifHovering.set(true);
  }

  onDropdownMouseLeave(): void {
    this.isNotifHovering.set(false);
    setTimeout(() => {
      if (!this.isNotifHovering()) {
        this.isNotifDropdownOpen.set(false);
      }
    }, 320);
  }

  loadRecentNotifications(): void {
    if (!this.isLoggedIn()) return;
    this.isLoadingNotifications.set(true);
    this.notificationsService.getAll().subscribe({
      next: (res) => {
        this.recentNotifications.set((res.data ?? []).slice(0, 6));
        this.isLoadingNotifications.set(false);
      },
      error: () => this.isLoadingNotifications.set(false),
    });
  }

  iconFor(type: string): string {
    return notificationIcon(type);
  }

  toneFor(type: string): string {
    return 'tone-' + notificationTone(type);
  }

  // Known types are ALWAYS shown in the user's language (the backend
  // currently sends English-only titles/messages). Unknown types fall
  // back to the backend text, then to a generic translated label.
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

  timeAgo(dateStr: string): string {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return this.translateService.instant('notifications.time.now');
      if (diffMins < 60) return this.translateService.instant('notifications.time.min_ago', { n: diffMins });
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return this.translateService.instant('notifications.time.hours_ago', { n: diffHours });
      const diffDays = Math.floor(diffHours / 24);
      return this.translateService.instant('notifications.time.days_ago', { n: diffDays });
    } catch {
      return '';
    }
  }

  openNotificationDetail(notif: AppNotification, event?: Event): void {
    event?.stopPropagation();
    this.selectedNotification.set(notif);
    this.notificationDetail.set(null);
    this.isLoadingDetail.set(true);
    this.showNotifDetailModal.set(true);
    this.isNotifDropdownOpen.set(false);

    if (!notif.is_read) {
      this.notificationsService.markAsRead(notif.id).subscribe({
        next: () => {
          this.recentNotifications.update((list) =>
            list.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
          );
        },
        error: () => undefined,
      });
    }

    const refId = notif.reference_id;
    const refType = (notif.reference_type ?? notif.type ?? '').toUpperCase();
    if (!refId) {
      this.isLoadingDetail.set(false);
      return;
    }

    if (refType.includes('CONSULTATION') || refType.includes('CONSULT')) {
      this.consultationService.getById(refId).subscribe({
        next: (res) => {
          this.notificationDetail.set(res);
          this.isLoadingDetail.set(false);
        },
        error: () => this.isLoadingDetail.set(false),
      });
    } else if (refType.includes('CORPORATE') || refType.includes('B2B')) {
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

  closeNotifDetail(): void {
    this.showNotifDetailModal.set(false);
    this.selectedNotification.set(null);
    this.notificationDetail.set(null);
  }

  goToConsultationDetail(): void {
    const role = this.authService.role();
    this.closeNotifDetail();
    if (role === 'TRAINER') {
      this.router.navigate(['/portal/trainer/consultations']);
    } else {
      this.router.navigate(['/portal/student/consultations']);
    }
  }

  goToCorporateDetail(): void {
    this.closeNotifDetail();
    this.router.navigate(['/portal/student/corporate-requests']);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.themeService.toggleLanguage();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.isMobileMenuOpen() ? 'hidden' : '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    this.isUserMenuOpen.set(false);
    this.isNotifDropdownOpen.set(false);
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }

  profileRoute = computed(() => {
    const role = this.authService.role();
    if (role === 'TRAINER') return '/portal/trainer/profile';
    return '/portal/student/profile';
  });

  // Admins manage everything from the admin portal — no public profile page
  isAdminRole = computed(() => {
    const role = this.authService.role();
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  });

  notificationsRoute = computed(() => {
    const role = this.authService.role();
    if (role === 'TRAINER') return '/portal/trainer/notifications';
    return '/portal/student/notifications';
  });

  goToNotifications(): void {
    this.closeUserMenu();
    this.closeMobileMenu();
    this.isNotifDropdownOpen.set(false);
    this.router.navigate([this.notificationsRoute()]);
  }

  isConsultationDetail(detail: Consultation | CorporateRequest | null): detail is Consultation {
    return !!detail && 'title' in detail && 'status' in detail && !('company_name' in detail);
  }

  isCorporateDetail(detail: Consultation | CorporateRequest | null): detail is CorporateRequest {
    return !!detail && 'company_name' in detail;
  }
}
