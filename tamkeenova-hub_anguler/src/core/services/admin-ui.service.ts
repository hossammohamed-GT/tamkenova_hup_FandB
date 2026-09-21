import { Injectable, signal } from '@angular/core';

// -- Shared UI state across the Admin Portal pages (badges, counters) --
@Injectable({ providedIn: 'root' })
export class AdminUiService {
  pendingTrainers = signal(0);
  pendingVolunteers = signal(0);
  pendingCorporate = signal(0);

  setPendingCounts(stats: {
    pending_trainers_count?: number;
    pending_volunteers_count?: number;
    pending_corporate_requests_count?: number;
  }): void {
    if (stats.pending_trainers_count !== undefined)
      this.pendingTrainers.set(stats.pending_trainers_count ?? 0);
    if (stats.pending_volunteers_count !== undefined)
      this.pendingVolunteers.set(stats.pending_volunteers_count ?? 0);
    if (stats.pending_corporate_requests_count !== undefined)
      this.pendingCorporate.set(stats.pending_corporate_requests_count ?? 0);
  }
}
