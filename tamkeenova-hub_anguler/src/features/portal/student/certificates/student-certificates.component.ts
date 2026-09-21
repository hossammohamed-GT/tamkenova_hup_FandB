import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StudentService } from '../../../../core/services/student.service';
import { StudentCertificate } from '../../../../core/models/student.model';
import { PartnersService } from '../../../../core/services/partners.service';
import { StrategicPartner } from '../../../../core/models/partner.model';

@Component({
  selector: 'app-student-certificates',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, DatePipe],
  templateUrl: './student-certificates.component.html',
  styleUrls: ['../../portal-shared.css', './student-certificates.component.css'],
})
export class StudentCertificatesComponent {
  private studentService = inject(StudentService);
  private partnersService = inject(PartnersService);

  isLoading = signal(true);
  certificates = signal<StudentCertificate[]>([]);
  copiedCode = signal<string | null>(null);
  partners = signal<StrategicPartner[]>([]);

  constructor() {
    this.partnersService.listAll().subscribe({ next: (list) => this.partners.set(list ?? []), error: () => undefined });
    this.studentService.getCertificates().subscribe({
      next: (res) => {
        this.certificates.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  printCertificate(id: string): void {
    document.querySelectorAll(".certificate-print").forEach((el) => el.classList.remove("print-target"));
    document.getElementById("certificate-" + id)?.classList.add("print-target");
    window.print();
  }

  partnerLogo(id: string): string | null { return this.partners().find((partner) => partner.id === id)?.logo_url ?? null; }

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
