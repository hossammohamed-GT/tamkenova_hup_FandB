import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PartnersService } from '../../../../core/services/partners.service';
import { StrategicPartner } from '../../../../core/models/partner.model';
import { AdminNavComponent } from '../admin-nav/admin-nav.component';

@Component({ selector: 'app-admin-partners', standalone: true, imports: [CommonModule, ReactiveFormsModule, TranslatePipe, AdminNavComponent], templateUrl: './admin-partners.component.html', styleUrls: ['../../portal-shared.css', '../../staff-shared.css', './admin-partners.component.css'] })
export class AdminPartnersComponent implements OnInit {
  private service = inject(PartnersService);
  private fb = inject(FormBuilder);
  partners = signal<StrategicPartner[]>([]);
  editing = signal<StrategicPartner | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal(false);
  form = this.fb.nonNullable.group({ name_ar: ['', Validators.required], name_en: ['', Validators.required], logo_url: ['', Validators.required], website_url: [''], display_order: [0, [Validators.required, Validators.min(0)]], is_active: [true] });
  ngOnInit() { this.load(); }
  load() { this.loading.set(true); this.service.listAll().subscribe({ next: (data) => { this.partners.set(data ?? []); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } }); }
  openCreate() { this.editing.set(null); this.form.reset({ name_ar: '', name_en: '', logo_url: '', website_url: '', display_order: 0, is_active: true }); }
  edit(partner: StrategicPartner) { this.editing.set(partner); this.form.reset({ name_ar: partner.name_ar, name_en: partner.name_en, logo_url: partner.logo_url, website_url: partner.website_url ?? '', display_order: partner.display_order, is_active: partner.is_active }); }
  cancel() { this.editing.set(null); }
  save() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.saving.set(true); const call = this.editing() ? this.service.update(this.editing()!.id, this.form.getRawValue()) : this.service.create(this.form.getRawValue()); call.subscribe({ next: () => { this.saving.set(false); this.editing.set(null); this.load(); }, error: () => this.saving.set(false) }); }
  remove(partner: StrategicPartner) { if (!confirm('Delete this partner?')) return; this.service.remove(partner.id).subscribe(() => this.load()); }
  toggle(partner: StrategicPartner) { this.service.update(partner.id, { is_active: !partner.is_active }).subscribe(() => this.load()); }
}
