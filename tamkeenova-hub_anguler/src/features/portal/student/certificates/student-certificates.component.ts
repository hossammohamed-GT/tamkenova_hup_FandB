import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StudentService } from '../../../../core/services/student.service';
import { StudentCertificate } from '../../../../core/models/student.model';
import { PartnersService } from '../../../../core/services/partners.service';
import { StrategicPartner } from '../../../../core/models/partner.model';
import QRCode from 'qrcode';

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

  async downloadCertificate(cert: StudentCertificate): Promise<void> {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1100;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const bg = ctx.createLinearGradient(0, 0, 1600, 1100); bg.addColorStop(0, '#fffdf5'); bg.addColorStop(1, '#eef9f4');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1600, 1100); ctx.strokeStyle = '#138a70'; ctx.lineWidth = 18; ctx.strokeRect(36, 36, 1528, 1028); ctx.strokeStyle = '#d59b2b'; ctx.lineWidth = 3; ctx.strokeRect(62, 62, 1476, 976);
    ctx.textAlign = 'center'; ctx.fillStyle = '#138a70'; ctx.font = 'bold 42px Arial'; ctx.fillText('TAMKEENOVA', 800, 145); ctx.fillStyle = '#b17b18'; ctx.font = '24px Arial'; ctx.fillText((cert.certificate_type || 'CERTIFICATE').toUpperCase(), 800, 205);
    ctx.fillStyle = '#173f3b'; ctx.font = 'bold 54px Arial'; ctx.fillText('Certificate of Achievement', 800, 300); ctx.font = '28px Arial'; ctx.fillStyle = '#526460'; ctx.fillText('This certificate is proudly presented to', 800, 370);
    ctx.fillStyle = '#138a70'; ctx.font = 'bold 58px Arial'; ctx.fillText(cert.trainers?.users?.full_name || cert.title, 800, 465); ctx.fillStyle = '#173f3b'; ctx.font = 'bold 34px Arial'; ctx.fillText(cert.title, 800, 555); ctx.font = '24px Arial'; ctx.fillStyle = '#526460';
    const description = (cert.description || '').slice(0, 120); if (description) ctx.fillText(description, 800, 610); ctx.fillText(`Issued: ${new Date(cert.issued_at).toLocaleDateString()}   •   Code: ${cert.verification_code}`, 800, 690);
    const verifyUrl = `${window.location.origin}/verify?code=${encodeURIComponent(cert.verification_code)}`; const qr = await QRCode.toDataURL(verifyUrl, { width: 190, margin: 1, color: { dark: '#173f3b', light: '#ffffff' } }); const qrImage = await this.loadImage(qr); ctx.drawImage(qrImage, 1280, 790, 190, 190); ctx.font = '18px Arial'; ctx.fillText('Scan to verify', 1375, 1010);
    const logos = (cert.partner_ids || []).map((id) => this.partnerLogo(id)).filter((url): url is string => !!url).slice(0, 6); for (let i = 0; i < logos.length; i++) { try { const logo = await this.loadImage(logos[i]); ctx.drawImage(logo, 180 + i * 125, 850, 95, 58); } catch {} }
    const link = document.createElement('a'); link.download = `tamkeenova-certificate-${cert.verification_code}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  }

  private loadImage(src: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }

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
