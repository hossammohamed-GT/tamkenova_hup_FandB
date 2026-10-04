import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PartnersService } from '../../../../core/services/partners.service';
import { StrategicPartner } from '../../../../core/models/partner.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';
import { apiErrorKey } from '../../../../core/utils/api-error';

const URL_PATTERN = /^https?:\/\/.+/i;

@Component({ selector: 'app-admin-partners', standalone: true, imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent], templateUrl: './admin-partners.component.html', styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-partners.component.css'] })
export class AdminPartnersComponent implements OnInit {
  private service = inject(PartnersService);
  private fb = inject(FormBuilder);
  partners = signal<StrategicPartner[]>([]);
  editing = signal<StrategicPartner | null>(null);
  showForm = signal(false);
  loading = signal(true);
  saving = signal(false);
  error = signal(false);
  toast = signal<{ key: string; error?: boolean } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;
  form = this.fb.nonNullable.group({
    name_ar: ['', Validators.required],
    name_en: ['', Validators.required],
    logo_url: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
    website_url: ['', Validators.pattern(URL_PATTERN)],
    display_order: [0, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });
  ngOnInit() { this.load(); }
  load() { this.loading.set(true); this.service.listAll().subscribe({ next: (data) => { this.partners.set(data ?? []); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } }); }
  openCreate() { this.editing.set(null); this.showForm.set(true); this.form.reset({ name_ar: '', name_en: '', logo_url: '', website_url: '', display_order: 0, is_active: true }); }
  edit(partner: StrategicPartner) { this.editing.set(partner); this.showForm.set(true); this.form.reset({ name_ar: partner.name_ar, name_en: partner.name_en, logo_url: partner.logo_url, website_url: partner.website_url ?? '', display_order: partner.display_order, is_active: partner.is_active }); }
  cancel() { this.editing.set(null); this.showForm.set(false); }
  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const website = v.website_url.trim();
    const payload = {
      name_ar: v.name_ar.trim(),
      name_en: v.name_en.trim(),
      logo_url: v.logo_url.trim(),
      // Omit when empty: the API treats a missing value as "no website".
      website_url: website ? website : undefined,
      display_order: v.display_order,
      is_active: v.is_active,
    };
    const isEdit = !!this.editing();
    const call = isEdit ? this.service.update(this.editing()!.id, payload) : this.service.create(payload);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.showForm.set(false);
        this.showToast(isEdit ? 'admin_partners.updated' : 'admin_partners.created');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.showToast(apiErrorKey(err, 'admin_partners.save_error'), true);
      },
    });
  }
  remove(partner: StrategicPartner) {
    if (!confirm('Delete this partner?')) return;
    this.service.remove(partner.id).subscribe({
      next: () => { this.showToast('admin_partners.deleted'); this.load(); },
      error: (err) => this.showToast(apiErrorKey(err, 'admin_partners.delete_error'), true),
    });
  }
  toggle(partner: StrategicPartner) {
    this.service.update(partner.id, { is_active: !partner.is_active }).subscribe({
      next: () => this.load(),
      error: (err) => this.showToast(apiErrorKey(err, 'admin_partners.save_error'), true),
    });
  }
  private showToast(key: string, error = false) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ key, error });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
