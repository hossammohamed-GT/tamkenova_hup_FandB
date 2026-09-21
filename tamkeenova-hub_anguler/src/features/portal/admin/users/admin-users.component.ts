import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminUiService } from '../../../../core/services/admin-ui.service';
import {
  ActivityLog,
  AdminUser,
  ManagedRole,
  PaginationMeta,
} from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

const ROLE_FILTERS: Array<ManagedRole | 'ALL'> = [
  'ALL',
  'STUDENT',
  'TRAINER',
  'CLIENT',
  'EMPLOYEE',
  'VOLUNTEER',
  'ADMIN',
  'SUPER_ADMIN',
];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-users.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-users.component.css'],
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private adminUi = inject(AdminUiService);
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  readonly roleFilters = ROLE_FILTERS;

  isLoading = signal(true);
  hasError = signal(false);
  users = signal<AdminUser[]>([]);
  meta = signal<PaginationMeta | null>(null);

  search = signal('');
  roleFilter = signal<ManagedRole | 'ALL'>('ALL');
  activeFilter = signal<boolean | 'ALL'>('ALL');
  page = signal(1);
  readonly limit = 20;

  // -- Role change modal --
  roleTarget = signal<AdminUser | null>(null);
  selectedRole = signal<ManagedRole | null>(null);
  isChangingRole = signal(false);

  // -- Activity modal --
  activityTarget = signal<AdminUser | null>(null);
  activityLogs = signal<ActivityLog[]>([]);
  isLoadingActivity = signal(false);

  // -- Toast --
  toastKey = signal<string | null>(null);
  toastParams = signal<{ role?: string } | null>(null);

  private searchSubject = new Subject<string>();

  searchControl = this.fb.nonNullable.control('');

  totalPages = computed(() => this.meta()?.totalPages ?? 1);
  total = computed(() => this.meta()?.total ?? this.users().length);

  pages = computed(() => {
    const pagesCount = this.totalPages();
    const current = this.page();
    const windowSize = 2;
    const from = Math.max(1, current - windowSize);
    const to = Math.min(pagesCount, current + windowSize);
    const list: number[] = [];
    for (let i = from; i <= to; i++) list.push(i);
    return list;
  });

  roleBadgeClass(role: ManagedRole): string {
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'badge-info';
      case 'EMPLOYEE':
        return 'badge-medium';
      case 'VOLUNTEER':
        return 'badge-approved';
      case 'TRAINER':
        return 'badge-high';
      default:
        return 'badge-neutral';
    }
  }

  initials(name: string): string {
    return (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search.set(value.trim());
      this.page.set(1);
      this.load();
    });

    this.load();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  setRoleFilter(role: ManagedRole | 'ALL'): void {
    this.roleFilter.set(role);
    this.page.set(1);
    this.load();
  }

  setActiveFilter(value: boolean | 'ALL'): void {
    this.activeFilter.set(value);
    this.page.set(1);
    this.load();
  }

  goToPage(target: number): void {
    if (target < 1 || target > this.totalPages() || target === this.page()) return;
    this.page.set(target);
    this.load();
  }

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService
      .getUsers({
        search: this.search() || undefined,
        role: this.roleFilter(),
        is_active: this.activeFilter(),
        page: this.page(),
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res?.data ?? []);
          this.meta.set(res?.meta ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  // ================= Role change =================

  openRoleModal(user: AdminUser): void {
    this.roleTarget.set(user);
    this.selectedRole.set(user.role);
  }

  closeRoleModal(): void {
    this.roleTarget.set(null);
    this.selectedRole.set(null);
    this.isChangingRole.set(false);
  }

  pickRole(role: ManagedRole | 'ALL'): void {
    if (role === 'ALL') return;
    this.selectedRole.set(role);
  }

  confirmRoleChange(): void {
    const target = this.roleTarget();
    const role = this.selectedRole();
    if (!target || !role || role === target.role) {
      this.closeRoleModal();
      return;
    }
    this.isChangingRole.set(true);
    this.adminService.changeUserRole(target.id, role).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === target.id ? { ...u, role: updated?.role ?? role } : u)),
        );
        this.isChangingRole.set(false);
        this.closeRoleModal();
        this.showToast('admin_users.role_changed');
        this.refresh();
      },
      error: () => {
        this.isChangingRole.set(false);
        this.showToast('admin_users.role_change_error');
      },
    });
  }

  // ================= Activate / Deactivate =================

  toggleActive(user: AdminUser): void {
    const next = !user.is_active;
    this.adminService.changeUserStatus(user.id, next).subscribe({
      next: () => {
        this.users.update((list) => list.map((u) => (u.id === user.id ? { ...u, is_active: next } : u)));
        this.showToast(next ? 'admin_users.activated' : 'admin_users.deactivated');
        this.refresh();
      },
      error: () => this.showToast('admin_users.status_error'),
    });
  }

  // ================= Activity =================

  openActivity(user: AdminUser): void {
    this.activityTarget.set(user);
    this.activityLogs.set([]);
    this.isLoadingActivity.set(true);
    this.adminService.getUserActivity(user.id).subscribe({
      next: (logs) => {
        this.activityLogs.set(logs);
        this.isLoadingActivity.set(false);
      },
      error: () => {
        this.isLoadingActivity.set(false);
      },
    });
  }

  closeActivity(): void {
    this.activityTarget.set(null);
  }

  roleLabel(role: string | null | undefined): string {
    if (!role) return '';
    const key = 'status.user_role.' + role;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : role;
  }

  // ================= Toast =================

  private showToast(key: string): void {
    this.toastKey.set(key);
    setTimeout(() => this.toastKey.set(null), 3000);
  }
}
