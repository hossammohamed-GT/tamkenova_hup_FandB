import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { TrainerService } from '../../../../core/services/trainer.service';
import { TrainerDashboardStats } from '../../../../core/models/trainer-profile.model';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-dashboard.component.css'],
})
export class TrainerDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private trainerService = inject(TrainerService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isLoading = signal(true);
  hasLoaded = signal(false);
  stats = signal<TrainerDashboardStats | null>(null);
  hasError = signal(false);

  // ثبات الاكتمال - لا يختفي فجأة
  profileCompletion = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    let completed = 0;
    const total = 6;
    if ((s.programs_count ?? 0) > 0) completed++;
    if ((s.availability_count ?? 0) > 0) completed++;
    if ((s.reviews_count ?? 0) > 0) completed++;
    completed++; // بروفايل أساسي
    const avg = typeof s.average_rating === 'string' ? parseFloat(s.average_rating as any) : (s.average_rating ?? 0);
    if (avg > 0) completed++;
    completed++; // استشارات
    return Math.round((completed / total) * 100);
  });

  // خطوات الاكتمال التفصيلية للعرض المبهر
  completionSteps = computed(() => {
    const s = this.displayStats();
    const avg = typeof s.average_rating === 'string' ? parseFloat(s.average_rating as any) : (s.average_rating ?? 0);
    return [
      { key: 'profile', label: 'الملف الشخصي', icon: 'fa-user-pen', done: true, route: '/portal/trainer/profile' },
      { key: 'programs', label: 'إضافة برامج', icon: 'fa-book', done: (s.programs_count ?? 0) > 0, route: '/portal/trainer/programs', count: s.programs_count },
      { key: 'availability', label: 'تحديد المواعيد', icon: 'fa-calendar-days', done: (s.availability_count ?? 0) > 0, route: '/portal/trainer/availability', count: s.availability_count },
      { key: 'reviews', label: 'الحصول على تقييمات', icon: 'fa-star', done: (s.reviews_count ?? 0) > 0, route: '/portal/trainer/reviews', count: s.reviews_count },
      { key: 'rating', label: 'متوسط التقييم', icon: 'fa-chart-line', done: avg > 0, route: '/portal/trainer/reviews', count: avg },
      { key: 'consultations', label: 'إدارة الاستشارات', icon: 'fa-comments', done: true, route: '/portal/trainer/consultations' },
    ];
  });

  // للـ SVG
  readonly circumference = 2 * Math.PI * 54; // 339.292

  progressOffset = computed(() => {
    const pct = this.profileCompletion();
    return this.circumference - (pct / 100) * this.circumference;
  });

  // fallback دائم لمنع اختفاء الأقسام
  displayStats = computed(() => {
    const s = this.stats();
    if (s) return s;
    return {
      programs_count: 0,
      reviews_count: 0,
      availability_count: 0,
      average_rating: 0,
      ratings_count: 0,
    } as TrainerDashboardStats;
  });

  quickActions = [
    {
      icon: 'fa-comments',
      labelKey: 'trainer_dashboard.actions.manage_consultations',
      route: '/portal/trainer/consultations',
      color: 'primary',
    },
    {
      icon: 'fa-user-pen',
      labelKey: 'trainer_dashboard.actions.edit_profile',
      route: '/portal/trainer/profile',
      color: 'accent',
    },
    {
      icon: 'fa-book-medical',
      labelKey: 'trainer_dashboard.actions.add_program',
      route: '/portal/trainer/programs',
      color: 'success',
    },
    {
      icon: 'fa-calendar-plus',
      labelKey: 'trainer_dashboard.actions.set_availability',
      route: '/portal/trainer/availability',
      color: 'dark',
    },
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.trainerService.getDashboardStats().subscribe({
      next: (res) => {
        const data = (res as any).data ?? res;
        // تأكد أن data هي الإحصائيات وليس wrapper
        const statsData = (data as any).data ?? data;
        // لو statsData لسه wrapper، استخدمه مباشرة
        const finalStats = statsData && typeof statsData.programs_count !== 'undefined' ? statsData : data;
        this.stats.set(finalStats as TrainerDashboardStats);
        this.isLoading.set(false);
        this.hasLoaded.set(true);
      },
      error: (err) => {
        console.error('Dashboard stats error', err);
        this.hasError.set(true);
        this.isLoading.set(false);
        this.hasLoaded.set(true);
        // fallback يمنع الاختفاء
        if (!this.stats()) {
          this.stats.set({
            programs_count: 0,
            reviews_count: 0,
            availability_count: 0,
            average_rating: 0,
            ratings_count: 0,
          } as TrainerDashboardStats);
        }
      },
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
