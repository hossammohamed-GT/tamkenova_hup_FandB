import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StudentService } from '../../../../core/services/student.service';
import { StudentCertificate } from '../../../../core/models/student.model';
import { CertificateRenderer } from '../../../../core/certificates/certificate-renderer.service';
import {
  certificateValues,
  canRenderCertificate,
  getCertificateTemplate,
} from '../../../../core/certificates/certificate-template';

@Component({
  selector: 'app-student-certificates',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './student-certificates.component.html',
  styleUrls: ['../../portal-shared.css', './student-certificates.component.css'],
})
export class StudentCertificatesComponent {
  private studentService = inject(StudentService);
  private renderer = inject(CertificateRenderer);
  readonly canRender = canRenderCertificate;
  thumbnail(cert: StudentCertificate): string {
    return getCertificateTemplate(certificateValues(cert)).thumbnail;
  }
  isLoading = signal(true);
  hasError = signal(false);
  certificates = signal<StudentCertificate[]>([]);
  copiedCode = signal<string | null>(null);
  downloadingId = signal<string | null>(null);
  downloadError = signal<string | null>(null);
  constructor() {
    this.load();
  }
  load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.studentService.getCertificates().subscribe({
      next: (res) => {
        this.certificates.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }
  async downloadCertificate(cert: StudentCertificate, format: 'png' | 'pdf'): Promise<void> {
    if (this.downloadingId() || !cert.is_valid) return;
    this.downloadingId.set(cert.id);
    this.downloadError.set(null);
    try {
      await this.renderer.download(certificateValues(cert), format);
    } catch (error) {
      this.downloadError.set(
        error instanceof Error && error.message.startsWith('certificate_studio.')
          ? error.message
          : 'certificate_studio.render_error',
      );
    } finally {
      this.downloadingId.set(null);
    }
  }
  copyCode(code: string): void {
    navigator.clipboard?.writeText(code).then(
      () => {
        this.copiedCode.set(code);
        setTimeout(() => this.copiedCode.set(null), 2000);
      },
      () => undefined,
    );
  }
}
