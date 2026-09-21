import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { TasksService } from '../../../../core/services/tasks.service';
import { TasksDashboardStats } from '../../../../core/models/tasks.model';

@Component({
  selector: 'app-volunteer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './volunteer-dashboard.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './volunteer-dashboard.component.css'],
})
export class VolunteerDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private tasksService = inject(TasksService);

  isLoading = signal(true);
  hasError = signal(false);
  stats = signal<TasksDashboardStats | null>(null);

  readonly circumference = 2 * Math.PI * 52;

  currentUser = this.authService.currentUser;

  displayStats = computed<TasksDashboardStats>(() => {
    return (
      this.stats() ?? {
        total_tasks: 0,
        current_tasks: 0,
        completed_tasks: 0,
        delayed_tasks: 0,
        average_completion: 0,
        total_hours: 0,
        average_score: 0,
        on_time_rate: 0,
        certificates_count: 0,
        last_tasks: [],
      }
    );
  });

  coreCards = computed(() => {
    const s = this.displayStats();
    return [
      {
        labelKey: 'volunteer_dashboard.total',
        value: s.total_tasks,
        icon: 'fa-list-check',
        color: 'var(--color-primary)',
        route: '/portal/volunteer/tasks',
      },
      {
        labelKey: 'volunteer_dashboard.current',
        value: s.current_tasks,
        icon: 'fa-spinner',
        color: 'var(--color-accent)',
        route: '/portal/volunteer/tasks',
      },
      {
        labelKey: 'volunteer_dashboard.completed',
        value: s.completed_tasks,
        icon: 'fa-circle-check',
        color: 'var(--color-success)',
        route: '/portal/volunteer/tasks',
      },
      {
        labelKey: 'volunteer_dashboard.delayed',
        value: s.delayed_tasks,
        icon: 'fa-triangle-exclamation',
        color: 'var(--color-danger)',
        route: '/portal/volunteer/tasks',
      },
    ];
  });

  volunteerCards = computed(() => {
    const s = this.displayStats();
    return [
      {
        labelKey: 'volunteer_dashboard.hours',
        value: s.total_hours ?? 0,
        icon: 'fa-hourglass-half',
        color: '#0ea5a4',
      },
      {
        labelKey: 'volunteer_dashboard.avg_score',
        value: s.average_score ?? 0,
        icon: 'fa-star',
        color: 'var(--color-accent)',
      },
      {
        labelKey: 'volunteer_dashboard.on_time',
        value: (s.on_time_rate ?? 0),
        suffix: '%',
        icon: 'fa-gauge-high',
        color: '#2f7fbf',
      },
      {
        labelKey: 'volunteer_dashboard.certificates',
        value: s.certificates_count ?? 0,
        icon: 'fa-certificate',
        color: 'var(--color-success)',
      },
    ];
  });

  progressOffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.displayStats().average_completion ?? 0));
    return this.circumference - (pct / 100) * this.circumference;
  });

  statusBadge(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'badge-approved';
      case 'REJECTED':
        return 'badge-rejected';
      case 'SUBMITTED':
        return 'badge-high';
      case 'IN_PROGRESS':
        return 'badge-info';
      default:
        return 'badge-pending';
    }
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.tasksService.getDashboard().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
}
