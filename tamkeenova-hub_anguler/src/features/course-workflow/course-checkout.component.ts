import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseCatalogService } from '../../core/services/course-catalog.service';
import {
  CourseWorkflowService,
  Checkout,
  workflowError,
  workflowStatus,
} from '../../core/services/course-workflow.service';
@Component({
  selector: 'app-course-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './course-checkout.component.html',
  styleUrl: './workflow.css',
})
export class CourseCheckoutComponent {
  private readonly api = inject(CourseWorkflowService);
  private readonly catalog = inject(CourseCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly lang = inject(TranslateService);
  private readonly destroy = inject(DestroyRef);
  data = signal<Checkout | null>(null);
  error = signal('');
  success = signal('');
  loading = signal(true);
  busy = signal(false);
  slug = '';
  method = '';
  sender = '';
  amount: number | null = null;
  reference = '';
  notes = '';
  transferredAt = '';
  confirmed = false;
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.slug = params.get('slug') || '';
          return this.catalog.getCourseBySlug(this.slug);
        }),
        switchMap((course) => this.api.checkout(course.id)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (data) => this.accept(data),
        error: (e) => {
          this.error.set(workflowError(e));
          this.loading.set(false);
        },
      });
  }
  statusLabel(value: string) {
    return workflowStatus(value, this.t('ar', 'en') === 'en');
  }
  t(ar: string, en: string) {
    return this.lang.currentLang() === 'en' ? en : ar;
  }
  accept(data: Checkout) {
    this.data.set(data);
    this.method = data.methods[0]?.method || '';
    this.amount = Number(data.course.price);
    this.loading.set(false);
  }
  pending() {
    return this.data()?.requests.some((row) => row.status === 'PENDING');
  }
  refresh() {
    const id = this.data()?.course.id;
    if (!id) {
      location.reload();
      return;
    }
    this.loading.set(true);
    this.api
      .checkout(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (d) => this.accept(d),
        error: (e) => {
          this.loading.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  async copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.success.set(this.t('تم نسخ حساب الاستقبال.', 'Receiving account copied.'));
    } catch {
      this.error.set(
        this.t('حدد رقم الحساب وانسخه يدويًا.', 'Select the account and copy it manually.'),
      );
    }
  }
  enroll() {
    const data = this.data();
    if (!data) return;
    this.busy.set(true);
    this.api
      .enroll(data.course.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.refresh();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  submit() {
    const data = this.data();
    if (!data?.quote_token || !this.confirmed || this.busy()) return;
    const time = new Date(this.transferredAt);
    if (!Number.isFinite(time.getTime())) {
      this.error.set(this.t('اختار تاريخ التحويل.', 'Choose the transfer date.'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.api
      .report(data.course.id, {
        quote_token: data.quote_token,
        method: this.method,
        sender_account: this.sender,
        reported_amount: this.amount,
        transfer_reference: this.reference,
        transferred_at: time.toISOString(),
        notes: this.notes,
      })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.success.set(
            this.t(
              'اترسل طلبك للمراجعة. الكورس يتفعل بعد مطابقة التحويل، لا تحول مرة ثانية.',
              'Your report is awaiting review. Access activates after the transfer is verified; do not transfer again.',
            ),
          );
          this.refresh();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
}
