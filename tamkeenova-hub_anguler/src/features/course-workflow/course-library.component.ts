import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CourseWorkflowService,
  WorkflowEnrollment,
  Transfer,
  workflowError,
  workflowStatus,
} from '../../core/services/course-workflow.service';
import { CertificateRenderer } from '../../core/certificates/certificate-renderer.service';
import { certificateValues } from '../../core/certificates/certificate-template';
@Component({
  selector: 'app-course-library',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-library.component.html',
  styleUrl: './workflow.css',
})
export class CourseLibraryComponent {
  private readonly api = inject(CourseWorkflowService);
  private readonly lang = inject(TranslateService);
  private readonly destroy = inject(DestroyRef);
  private readonly renderer = inject(CertificateRenderer);
  payments = signal<Transfer[]>([]);
  rows = signal<WorkflowEnrollment[]>([]);
  loading = signal(true);
  error = signal('');
  downloading = signal(false);
  constructor() {
    this.load();
  }
  statusLabel(value: string) {
    return workflowStatus(value, this.t('ar', 'en') === 'en');
  }
  t(ar: string, en: string) {
    return this.lang.currentLang() === 'en' ? en : ar;
  }
  load() {
    this.api
      .myPayments()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (rows) => this.payments.set(rows),
        error: (e) => this.error.set(workflowError(e)),
      });
    this.loading.set(true);
    this.error.set('');
    this.api
      .library()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.error.set(workflowError(e));
        },
      });
  }
  async download(row: WorkflowEnrollment, language: 'ar' | 'en') {
    if (!row.certificate?.is_valid || this.downloading()) return;
    this.downloading.set(true);
    try {
      await this.renderer.download(certificateValues(row.certificate, language), 'pdf');
    } catch {
      this.error.set(
        this.t(
          'تعذّر تحميل الشهادة، حاول مرة أخرى.',
          'Could not download the certificate. Please retry.',
        ),
      );
    } finally {
      this.downloading.set(false);
    }
  }
}
