import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminUiService } from '../../../../core/services/admin-ui.service';

interface AdminNavLink {
  labelKey: string;
  route: string;
  icon: string;
  exact?: boolean;
  badge?: 'trainers' | 'volunteers' | 'corporate';
}

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-nav.component.html',
  styleUrls: ['../../staff-shared.css', './admin-nav.component.css'],
})
export class AdminNavComponent {
  protected adminUi = inject(AdminUiService);

  readonly links: AdminNavLink[] = [
    { labelKey: 'admin_nav.dashboard', route: '/portal/admin', icon: 'fa-gauge-high', exact: true },
    { labelKey: 'admin_nav.users', route: '/portal/admin/users', icon: 'fa-users' },
    { labelKey: 'admin_nav.trainers', route: '/portal/admin/trainers', icon: 'fa-chalkboard-user', badge: 'trainers' },
    { labelKey: 'admin_nav.volunteers', route: '/portal/admin/volunteers', icon: 'fa-people-group', badge: 'volunteers' },
    { labelKey: 'admin_nav.certificates', route: '/portal/admin/certificates', icon: 'fa-certificate' },
    { labelKey: 'admin_nav.corporate', route: '/portal/admin/corporate', icon: 'fa-building', badge: 'corporate' },
    { labelKey: 'admin_nav.specializations', route: '/portal/admin/specializations', icon: 'fa-layer-group' },
    { labelKey: 'admin_nav.programs', route: '/portal/admin/programs', icon: 'fa-book-open' },
    { labelKey: 'admin_nav.tasks', route: '/portal/admin/tasks', icon: 'fa-list-check' },
  ];

  badgeCount(badge?: string): number {
    if (badge === 'trainers') return this.adminUi.pendingTrainers();
    if (badge === 'volunteers') return this.adminUi.pendingVolunteers();
    if (badge === 'corporate') return this.adminUi.pendingCorporate();
    return 0;
  }
}
