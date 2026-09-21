import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services/auth.service';
import { TasksService } from '../../../../core/services/tasks.service';
import { TasksDashboardStats } from '../../../../core/models/tasks.model';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './employee-dashboard.component.css'],
})
export class EmployeeDashboardComponent implements OnInit {
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
      }
    );
  });

  progressOffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.displayStats().average_completion ?? 0));
    return this.circumference - (pct / 100) * this.circumference;
  });

  cards = computed(() => {
    const s = this.displayStats();
    return [
      {
        labelKey: 'employee_dashboard.total',
        value: s.total_tasks,
        icon: 'fa-list-check',
        color: 'var(--color-primary)',
        route: '/portal/employee/tasks',
      },
      {
        labelKey: 'employee_dashboard.current',
        value: s.current_tasks,
        icon: 'fa-spinner',
        color: 'var(--color-accent)',
        route: '/portal/employee/tasks',
      },
      {
        labelKey: 'employee_dashboard.completed',
        value: s.completed_tasks,
        icon: 'fa-circle-check',
        color: 'var(--color-success)',
        route: '/portal/employee/tasks',
      },
      {
        labelKey: 'employee_dashboard.delayed',
        value: s.delayed_tasks,
        icon: 'fa-triangle-exclamation',
        color: 'var(--color-danger)',
        route: '/portal/employee/tasks',
      },
    ];
  });

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
