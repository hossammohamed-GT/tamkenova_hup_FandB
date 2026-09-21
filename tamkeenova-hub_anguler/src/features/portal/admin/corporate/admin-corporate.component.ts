import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminUiService } from '../../../../core/services/admin-ui.service';
import {
  AdminCorporateRequest,
  AdminUser,
  CorporateAction,
} from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';

@Component({
  selector: 'app-admin-corporate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-corporate.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-corporate.component.css'],
})
export class AdminCorporateComponent implements OnInit {
  private adminService = inject(AdminService);
  private adminUi = inject(AdminUiService);
  private fb = inject(FormBuilder);

  readonly filters: Array<CorporateAction | 'ALL'> = [
    'ALL',
    'PENDING',
    'UNDER_REVIEW',
    'ASSIGNED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
  ];

  isLoading = signal(true);
  hasError = signal(false);
  requests = signal<AdminCorporateRequest[]>([]);
  activeFilter = signal<CorporateAction | 'ALL'>('ALL');

  pendingCount = computed(
    () => this.requests().filter((r) => (r.status ?? 'PENDING') === 'PENDING').length,
  );

  // -- Details modal --
  details = signal<AdminCorporateRequest | null>(null);
  isLoadingDetails = signal(false);
  isUpdating = signal(false);

  // -- Employees picker --
  employees = signal<AdminUser[]>([]);
  isLoadingEmployees = signal(false);
  selectedEmployee = signal<AdminUser | null>(null);

  actionForm = this.fb.nonNullable.group({
    action: this.fb.nonNullable.control<CorporateAction>('UNDER_REVIEW'),
    admin_notes: [''],
    reason: [''],
  });

  toast = signal<{ key: string; error?: boolean } | null>(null);

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.requests();
    if (f === 'ALL') return list;
    return list.filter((r) => (r.status ?? 'PENDING') === f);
  });

  statusBadge(status: string): string {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return 'badge-approved';
      case 'REJECTED':
        return 'badge-rejected';
      case 'ASSIGNED':
        return 'badge-info';
      case 'UNDER_REVIEW':
        return 'badge-medium';
      default:
        return 'badge-pending';
    }
  }

  ngOnInit(): void {
    this.load();
  }

  setFilter(filter: CorporateAction | 'ALL'): void {
    this.activeFilter.set(filter);
  }

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService.getCorporateRequests().subscribe({
      next: (list) => {
        this.requests.set(list);
        this.adminUi.pendingCorporate.set(
          list.filter((r) => (r.status ?? 'PENDING') === 'PENDING').length,
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  // ================= Details =================

  openDetails(request: AdminCorporateRequest): void {
    this.details.set(request);
    this.selectedEmployee.set(null);
    this.actionForm.reset({
      action: this.nextAction(request),
      admin_notes: request.admin_notes ?? '',
      reason: request.rejection_reason ?? '',
    });
    this.isLoadingDetails.set(true);
    this.adminService.getCorporateRequest(request.id).subscribe({
      next: (full) => {
        this.details.set(full);
        this.isLoadingDetails.set(false);
        if (full.assigned_employee) {
          this.selectedEmployee.set(full.assigned_employee as AdminUser);
        }
      },
      error: () => this.isLoadingDetails.set(false),
    });
    this.loadEmployees();
  }

  closeDetails(): void {
    this.details.set(null);
  }

  private nextAction(request: AdminCorporateRequest): CorporateAction {
    switch (request.status) {
      case 'PENDING':
        return 'UNDER_REVIEW';
      case 'UNDER_REVIEW':
        return 'ASSIGNED';
      case 'ASSIGNED':
        return 'APPROVED';
      default:
        return 'COMPLETED';
    }
  }

  private loadEmployees(): void {
    this.isLoadingEmployees.set(true);
    this.adminService.getUsers({ role: 'EMPLOYEE', limit: 50 }).subscribe({
      next: (res) => {
        this.employees.set(res?.data ?? []);
        this.isLoadingEmployees.set(false);
      },
      error: () => this.isLoadingEmployees.set(false),
    });
  }

  setAction(action: CorporateAction | 'ALL'): void {
    if (action === 'ALL') return;
    this.actionForm.patchValue({ action });
  }

  pickEmployee(employee: AdminUser): void {
    this.selectedEmployee.set(employee);
  }

  submitAction(): void {
    const current = this.details();
    if (!current) return;

    const raw = this.actionForm.getRawValue();
    const action = raw.action;

    if (action === 'ASSIGNED' && !this.selectedEmployee()) {
      this.showToast('admin_corporate.employee_required', true);
      return;
    }

    this.isUpdating.set(true);
    this.adminService
      .updateCorporateRequestStatus(current.id, {
        action,
        assigned_to: action === 'ASSIGNED' ? this.selectedEmployee()!.id : undefined,
        admin_notes: raw.admin_notes || undefined,
        reason: action === 'REJECTED' ? raw.reason || undefined : undefined,
      })
      .subscribe({
        next: (updated) => {
          const merged = updated ?? { ...current, status: action };
          this.requests.update((list) =>
            list.map((r) => (r.id === current.id ? { ...r, ...merged } : r)),
          );
          this.details.set({ ...current, ...merged });
          this.adminUi.pendingCorporate.set(
            this.requests().filter((r) => (r.status ?? 'PENDING') === 'PENDING').length,
          );
          this.isUpdating.set(false);
          this.showToast('admin_corporate.updated');
          this.refresh();
          // Refresh the open modal with authoritative server data
          this.adminService.getCorporateRequest(current.id).subscribe({
            next: (full) => {
              if (this.details()?.id === current.id && full) this.details.set(full);
            },
            error: () => undefined,
          });
        },
        error: (err) => {
          this.isUpdating.set(false);
          this.showToast(apiErrorKey(err, 'admin_corporate.update_error'), true);
        },
      });
  }

  private showToast(key: string, error = false): void {
    this.toast.set({ key, error });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
