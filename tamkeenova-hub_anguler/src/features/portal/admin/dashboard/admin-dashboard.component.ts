import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminUiService } from '../../../../core/services/admin-ui.service';
import { AdminDashboardStats } from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

interface DashCard {
  labelKey: string;
  value: number;
  icon: string;
  color: string;
  route: string;
  pending?: number;
  pendingLabelKey?: string;
  pendingRoute?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private adminUi = inject(AdminUiService);

  isLoading = signal(true);
  hasError = signal(false);
  stats = signal<AdminDashboardStats | null>(null);

  displayStats = computed<AdminDashboardStats>(() => {
    return (
      this.stats() ?? {
        users_count: 0,
        students_count: 0,
        trainers_count: 0,
        pending_trainers_count: 0,
        employees_count: 0,
        volunteers_count: 0,
        pending_volunteers_count: 0,
        programs_count: 0,
        consultations_count: 0,
        corporate_requests_count: 0,
        pending_corporate_requests_count: 0,
        certificates_count: 0,
        tasks_count: 0,
      }
    );
  });

  cards = computed<DashCard[]>(() => {
    const s = this.displayStats();
    return [
      {
        labelKey: 'admin_dashboard.users',
        value: s.users_count,
        icon: 'fa-users',
        color: 'var(--color-primary)',
        route: '/portal/admin/users',
      },
      {
        labelKey: 'admin_dashboard.students',
        value: s.students_count,
        icon: 'fa-graduation-cap',
        color: '#2f7fbf',
        route: '/portal/admin/users',
      },
      {
        labelKey: 'admin_dashboard.trainers',
        value: s.trainers_count,
        icon: 'fa-chalkboard-user',
        color: 'var(--color-accent)',
        route: '/portal/admin/trainers',
        pending: s.pending_trainers_count,
        pendingLabelKey: 'admin_dashboard.pending',
        pendingRoute: '/portal/admin/trainers',
      },
      {
        labelKey: 'admin_dashboard.volunteers',
        value: s.volunteers_count,
        icon: 'fa-people-group',
        color: 'var(--color-success)',
        route: '/portal/admin/volunteers',
        pending: s.pending_volunteers_count,
        pendingLabelKey: 'admin_dashboard.pending',
        pendingRoute: '/portal/admin/volunteers',
      },
      {
        labelKey: 'admin_dashboard.employees',
        value: s.employees_count,
        icon: 'fa-id-badge',
        color: 'var(--color-primary)',
        route: '/portal/admin/users',
      },
      {
        labelKey: 'admin_dashboard.programs',
        value: s.programs_count,
        icon: 'fa-book-open',
        color: '#8b5cf6',
        route: '/portal/admin/programs',
      },
      {
        labelKey: 'admin_dashboard.consultations',
        value: s.consultations_count,
        icon: 'fa-comments',
        color: '#0ea5a4',
        route: '/portal/admin/programs',
      },
      {
        labelKey: 'admin_dashboard.corporate_requests',
        value: s.corporate_requests_count,
        icon: 'fa-building',
        color: 'var(--color-accent)',
        route: '/portal/admin/corporate',
        pending: s.pending_corporate_requests_count,
        pendingLabelKey: 'admin_dashboard.pending',
        pendingRoute: '/portal/admin/corporate',
      },
      {
        labelKey: 'admin_dashboard.certificates',
        value: s.certificates_count,
        icon: 'fa-certificate',
        color: 'var(--color-success)',
        route: '/portal/admin/certificates',
      },
      {
        labelKey: 'admin_dashboard.tasks',
        value: s.tasks_count,
        icon: 'fa-list-check',
        color: 'var(--color-danger)',
        route: '/portal/admin/tasks',
      },
    ];
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService.getDashboard().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.adminUi.setPendingCounts(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
