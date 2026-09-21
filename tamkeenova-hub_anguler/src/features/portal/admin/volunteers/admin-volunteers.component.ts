import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminUiService } from '../../../../core/services/admin-ui.service';
import { AdminVolunteer, VolunteerStatus } from '../../../../core/models/admin.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

type VolunteerFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

@Component({
  selector: 'app-admin-volunteers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent],
  templateUrl: './admin-volunteers.component.html',
  styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-volunteers.component.css'],
})
export class AdminVolunteersComponent implements OnInit {
  private adminService = inject(AdminService);
  private adminUi = inject(AdminUiService);
  private fb = inject(FormBuilder);

  readonly filters: VolunteerFilter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

  isLoading = signal(true);
  hasError = signal(false);
  volunteers = signal<AdminVolunteer[]>([]);
  activeFilter = signal<VolunteerFilter>('ALL');

  // The API may expose the status as `volunteer_status` (like trainers) or `status`
  statusOf(v: AdminVolunteer): VolunteerStatus {
    return ((v as AdminVolunteer).volunteer_status ?? v.status ?? 'PENDING') as VolunteerStatus;
  }

  pendingCount = computed(
    () => this.volunteers().filter((v) => this.statusOf(v) === 'PENDING').length,
  );

  busyId = signal<string | null>(null);

  // -- Reject modal --
  rejectTarget = signal<AdminVolunteer | null>(null);
  rejectForm = this.fb.nonNullable.group({ reason: [''] });
  isRejecting = signal(false);

  // -- Details modal --
  details = signal<AdminVolunteer | null>(null);
  isLoadingDetails = signal(false);

  filtered = computed(() => {
    const f = this.activeFilter();
    const list = this.volunteers();
    if (f === 'ALL') return list;
    return list.filter((v) => this.statusOf(v) === f);
  });

  statusBadge(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'badge-approved';
      case 'REJECTED':
        return 'badge-rejected';
      default:
        return 'badge-pending';
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
    this.load();
  }

  setFilter(filter: VolunteerFilter): void {
    this.activeFilter.set(filter);
  }

  // Silent re-fetch (no spinner) to reconcile with the server after mutations
  refresh(): void {
    this.load(false);
  }

  load(showSpinner = true): void {
    if (showSpinner) this.isLoading.set(true);
    this.hasError.set(false);
    this.adminService.getVolunteers().subscribe({
      next: (list) => {
        this.volunteers.set(list);
        this.adminUi.pendingVolunteers.set(list.filter((v) => this.statusOf(v) === 'PENDING').length);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  approve(volunteer: AdminVolunteer): void {
    this.busyId.set(volunteer.id);
    this.adminService.approveVolunteer(volunteer.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.refresh();
        this.refreshDetailsIfOpen(volunteer.id);
      },
      error: () => {
        this.busyId.set(null);
        this.showError('admin_volunteers.action_error');
      },
    });
  }

  askReject(volunteer: AdminVolunteer): void {
    this.rejectTarget.set(volunteer);
    this.rejectForm.reset({ reason: '' });
  }

  closeReject(): void {
    this.rejectTarget.set(null);
    this.isRejecting.set(false);
  }

  confirmReject(): void {
    const target = this.rejectTarget();
    if (!target) return;
    this.isRejecting.set(true);
    this.adminService.rejectVolunteer(target.id, this.rejectForm.getRawValue().reason || undefined).subscribe({
      next: () => {
        this.isRejecting.set(false);
        this.closeReject();
        this.refresh();
        this.refreshDetailsIfOpen(target.id);
      },
      error: () => {
        this.isRejecting.set(false);
        this.showError('admin_volunteers.action_error');
      },
    });
  }

  openDetails(volunteer: AdminVolunteer): void {
    this.details.set(volunteer);
    this.isLoadingDetails.set(true);
    this.adminService.getVolunteer(volunteer.id).subscribe({
      next: (full) => {
        this.details.set(full);
        this.isLoadingDetails.set(false);
      },
      error: () => this.isLoadingDetails.set(false),
    });
  }

  closeDetails(): void {
    this.details.set(null);
  }

  // Re-fetch the open details modal content from the server
  private refreshDetailsIfOpen(volunteerId: string): void {
    const current = this.details();
    if (!current || current.id !== volunteerId) return;
    this.adminService.getVolunteer(volunteerId).subscribe({
      next: (full) => {
        if (this.details()?.id === volunteerId && full) this.details.set(full);
      },
      error: () => undefined,
    });
  }

  private replaceVolunteer(updated: AdminVolunteer): void {
    this.volunteers.update((list) => {
      const merged = list.map((v) => (v.id === updated.id ? { ...v, ...updated, users: updated.users ?? v.users } : v));
      this.adminUi.pendingVolunteers.set(
        merged.filter((v) => this.statusOf(v) === 'PENDING').length,
      );
      return merged;
    });
    const current = this.details();
    if (current && current.id === updated.id) {
      this.details.set({ ...current, ...updated });
    }
  }

  private showError(key: string): void {
    this.volunteerError.set(key);
    setTimeout(() => this.volunteerError.set(null), 3000);
  }

  volunteerError = signal<string | null>(null);
}
