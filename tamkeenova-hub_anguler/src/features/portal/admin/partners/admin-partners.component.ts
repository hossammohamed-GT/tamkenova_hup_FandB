import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PartnersService } from '../../../../core/services/partners.service';
import { StrategicPartner } from '../../../../core/models/partner.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

// Backend requires absolute http(s) URLs — catch bad input before submit.
function urlValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

function apiMessages(err: any): string[] {
  const m = err?.error?.message;
  if (Array.isArray(m)) return m.slice(0, 3).map(String);
  if (typeof m === 'string') return [m];
  return [];
}

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
  actionErrorKey = signal<string | null>(null);
  actionErrorDetails = signal<string[]>([]);
  form = this.fb.nonNullable.group({ name_ar: ['', Validators.required], name_en: ['', Validators.required], logo_url: ['', [Validators.required, urlValidator]], website_url: ['', [urlValidator]], display_order: [0, [Validators.required, Validators.min(0)]], is_active: [true] });
  ngOnInit() { this.load(); }
  load() { this.loading.set(true); this.service.listAll().subscribe({ next: (data) => { this.partners.set(data ?? []); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } }); }
  private clearActionError() { this.actionErrorKey.set(null); this.actionErrorDetails.set([]); }
  private fail(key: string, err: any) { this.actionErrorKey.set(key); this.actionErrorDetails.set(apiMessages(err)); }
  openCreate() { this.editing.set(null); this.showForm.set(true); this.clearActionError(); this.form.reset({ name_ar: '', name_en: '', logo_url: '', website_url: '', display_order: 0, is_active: true }); }
  edit(partner: StrategicPartner) { this.editing.set(partner); this.showForm.set(true); this.clearActionError(); this.form.reset({ name_ar: partner.name_ar, name_en: partner.name_en, logo_url: partner.logo_url, website_url: partner.website_url ?? '', display_order: partner.display_order, is_active: partner.is_active }); }
  cancel() { this.editing.set(null); this.showForm.set(false); this.clearActionError(); }
  save() {
    this.clearActionError();
    if (this.form.invalid) { this.form.markAllAsTouched(); this.actionErrorKey.set('admin_partners.check_fields'); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const payload = { ...raw, name_ar: raw.name_ar.trim(), name_en: raw.name_en.trim(), logo_url: raw.logo_url.trim(), website_url: raw.website_url.trim() || undefined };
    const call = this.editing() ? this.service.update(this.editing()!.id, payload) : this.service.create(payload);
    call.subscribe({ next: () => { this.saving.set(false); this.editing.set(null); this.showForm.set(false); this.load(); }, error: (err) => { this.saving.set(false); this.fail('admin_partners.action_error', err); } });
  }
  remove(partner: StrategicPartner) { if (!confirm('Delete this partner?')) return; this.clearActionError(); this.service.remove(partner.id).subscribe({ next: () => this.load(), error: (err) => this.fail('admin_partners.action_error', err) }); }
  toggle(partner: StrategicPartner) { this.clearActionError(); this.service.update(partner.id, { is_active: !partner.is_active }).subscribe({ next: () => this.load(), error: (err) => this.fail('admin_partners.action_error', err) }); }
}
