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
    // A composed, high-resolution certificate artwork: navy identity, ivory paper and Tamkeenova gold.
    const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1273;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const navy = '#004265', gold = '#be8a3f', ink = '#101e27', paper = '#fcfaf4';
    ctx.fillStyle = navy; ctx.fillRect(0, 0, 1800, 1273);
    // Architectural side bands and subtle pattern
    ctx.fillStyle = '#003650'; ctx.fillRect(0, 0, 210, 1273); ctx.fillRect(1590, 0, 210, 1273);
    ctx.strokeStyle = 'rgba(190,138,63,.22)'; ctx.lineWidth = 2;
    for (let x = -900; x < 1800; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 1273, 1273); ctx.stroke(); }
    ctx.fillStyle = paper; ctx.fillRect(160, 90, 1480, 1093);
    ctx.strokeStyle = gold; ctx.lineWidth = 7; ctx.strokeRect(185, 115, 1430, 1043);
    ctx.strokeStyle = '#d8b777'; ctx.lineWidth = 2; ctx.strokeRect(207, 137, 1386, 999);
    // Corner ornaments
    ctx.strokeStyle = gold; ctx.lineWidth = 5;
    for (const [x, y, sx, sy] of [[207,137,1,1],[1593,137,-1,1],[207,1136,1,-1],[1593,1136,-1,-1]] as const) { ctx.beginPath(); ctx.moveTo(x, y + sy * 105); ctx.lineTo(x, y); ctx.lineTo(x + sx * 105, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x + sx * 18, y + sy * 18, 10, 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'center';
    // Brand mark + identity
    try { const logo = await this.loadImage('/images/logo.svg'); ctx.drawImage(logo, 805, 155, 110, 110); } catch {}
    ctx.fillStyle = navy; ctx.font = 'bold 30px Arial'; ctx.fillText('TAMKEENOVA', 900, 292);
    ctx.fillStyle = gold; ctx.font = '18px Arial'; ctx.fillText('EMPOWERMENT  •  TRAINING  •  IMPACT', 900, 325);
    ctx.fillStyle = ink; ctx.font = 'bold 60px Georgia, serif'; ctx.fillText('Certificate of Achievement', 900, 445);
    ctx.fillStyle = gold; ctx.font = 'bold 22px Arial'; ctx.fillText((cert.certificate_type || 'CERTIFICATE').toUpperCase(), 900, 495);
    ctx.fillStyle = '#69757a'; ctx.font = '25px Arial'; ctx.fillText('This certificate is proudly presented to', 900, 570);
    ctx.fillStyle = navy; ctx.font = 'bold 62px Georgia, serif'; ctx.fillText(cert.trainers?.users?.full_name || cert.title, 900, 670);
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(560, 700); ctx.lineTo(1240, 700); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = 'bold 32px Arial'; ctx.fillText(cert.title, 900, 770);
    ctx.fillStyle = '#69757a'; ctx.font = '22px Arial';
    const description = (cert.description || '').slice(0, 145); if (description) ctx.fillText(description, 900, 820);
    ctx.font = '20px Arial'; ctx.fillText(`Issued ${new Date(cert.issued_at).toLocaleDateString()}   |   Verification code: ${cert.verification_code}`, 900, 875);
    // QR area is deliberately on a white card for reliable scanning after download/printing.
    ctx.fillStyle = '#ffffff'; ctx.fillRect(1330, 905, 205, 205); ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.strokeRect(1330, 905, 205, 205);
    const verifyUrl = `${window.location.origin}/verify?code=${encodeURIComponent(cert.verification_code)}`;
    const qr = await QRCode.toDataURL(verifyUrl, { width: 185, margin: 1, color: { dark: navy, light: '#ffffff' } }); ctx.drawImage(await this.loadImage(qr), 1340, 915, 185, 185);
    ctx.fillStyle = '#69757a'; ctx.font = '16px Arial'; ctx.fillText('SCAN TO VERIFY', 1432, 1135);
    const logos = (cert.partner_ids || []).map((id) => this.partnerLogo(id)).filter((url): url is string => !!url).slice(0, 6);
    for (let i = 0; i < logos.length; i++) { try { ctx.drawImage(await this.loadImage(logos[i]), 300 + i * 125, 990, 95, 55); } catch {} }
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
