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

  async downloadCertificate(cert: StudentCertificate, language: 'ar' | 'en'): Promise<void> {
    // A composed, high-resolution certificate artwork: navy identity, ivory paper and Tamkeenova gold.
    const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1273;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const navy = '#004265', gold = '#be8a3f', ink = '#101e27', paper = '#fcfaf4';
    const isArabic = language === 'ar'; const isVolunteer = cert.certificate_type === 'VOLUNTEER'; const title = (isArabic ? cert.title_ar : cert.title_en) || cert.title; const description = ((isArabic ? cert.description_ar : cert.description_en) || cert.description || '').slice(0, 145); const labels = isArabic ? { cert: isVolunteer ? 'شهادة تطوع' : 'شهادة إتمام', presented: 'تشهد هذه الشهادة بأن', completed: isVolunteer ? 'ساهم بنجاح في العمل التطوعي' : 'أتم بنجاح', issued: 'تاريخ الإصدار', verify: 'امسح للتحقق' } : { cert: isVolunteer ? 'Certificate of Volunteering' : 'Certificate of Completion', presented: 'This certificate is proudly presented to', completed: isVolunteer ? 'Has successfully contributed as a volunteer' : 'Has successfully completed', issued: 'Issued', verify: 'SCAN TO VERIFY' };
    ctx.direction = isArabic ? 'rtl' : 'ltr';
    const backgroundPath = cert.certificate_type === 'VOLUNTEER' ? '/images/certificate-volunteer-bg.png' : '/images/certificate-program-bg.png';
    try { ctx.drawImage(await this.loadImage(backgroundPath), 0, 0, 1800, 1273); } catch { ctx.fillStyle = paper; ctx.fillRect(0, 0, 1800, 1273); }
    // A translucent security watermark is layered over the artwork and is intentionally difficult to erase cleanly.
    ctx.save(); ctx.globalAlpha = 0.045; ctx.fillStyle = navy; ctx.font = 'bold 42px Arial'; ctx.rotate(-0.18);
    for (let y = -300; y < 1500; y += 115) for (let x = -400; x < 2100; x += 430) ctx.fillText('TAMKEENOVA • VERIFIED • ' + cert.verification_code, x, y);
    ctx.restore();
    // Corner ornaments
    ctx.strokeStyle = gold; ctx.lineWidth = 5;
    for (const [x, y, sx, sy] of [[207,137,1,1],[1593,137,-1,1],[207,1136,1,-1],[1593,1136,-1,-1]] as const) { ctx.beginPath(); ctx.moveTo(x, y + sy * 105); ctx.lineTo(x, y); ctx.lineTo(x + sx * 105, y); ctx.stroke(); ctx.beginPath(); ctx.arc(x + sx * 18, y + sy * 18, 10, 0, Math.PI * 2); ctx.stroke(); }
    ctx.textAlign = 'center';
    // Brand mark + identity
    try { const logo = await this.loadImage('/images/logo.svg'); ctx.drawImage(logo, 805, 155, 110, 110); } catch {}
    ctx.fillStyle = navy; ctx.font = 'bold 30px Arial'; ctx.fillText('TAMKEENOVA', 900, 292);
    ctx.fillStyle = gold; ctx.font = '18px Arial'; ctx.fillText('EMPOWERMENT  •  TRAINING  •  IMPACT', 900, 325);
    ctx.fillStyle = ink; ctx.font = 'bold 60px Georgia, serif'; ctx.fillText(labels.cert, 900, 445);
    ctx.fillStyle = gold; ctx.font = 'bold 22px Arial'; ctx.fillText(labels.completed, 900, 495);
    ctx.fillStyle = '#69757a'; ctx.font = '25px Arial'; ctx.fillText(labels.presented, 900, 570);
    ctx.fillStyle = navy; ctx.font = 'bold 62px Georgia, serif'; ctx.fillText(cert.trainers?.users?.full_name || title, 900, 670);
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(560, 700); ctx.lineTo(1240, 700); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = 'bold 32px Arial'; ctx.fillText(title, 900, 770);
    ctx.fillStyle = '#69757a'; ctx.font = '22px Arial';
    if (description) ctx.fillText(description, 900, 820);
    ctx.font = '20px Arial'; ctx.fillText(`${labels.issued} ${new Date(cert.issued_at).toLocaleDateString()}   |   Verification code: ${cert.verification_code}`, 900, 875);
    // QR area is deliberately on a white card for reliable scanning after download/printing.
    ctx.fillStyle = '#ffffff'; ctx.fillRect(1330, 905, 205, 205); ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.strokeRect(1330, 905, 205, 205);
    const verifyUrl = `${window.location.origin}/verify?code=${encodeURIComponent(cert.verification_code)}`;
    const qr = await QRCode.toDataURL(verifyUrl, { width: 185, margin: 1, color: { dark: navy, light: '#ffffff' } }); ctx.drawImage(await this.loadImage(qr), 1340, 915, 185, 185);
    ctx.fillStyle = '#69757a'; ctx.font = '16px Arial'; ctx.fillText(labels.verify, 1432, 1135);
    const logos = (cert.partner_ids || []).map((id) => this.partnerLogo(id)).filter((url): url is string => !!url).slice(0, 6);
    for (let i = 0; i < logos.length; i++) { try { ctx.drawImage(await this.loadImage(logos[i]), 300 + i * 125, 990, 95, 55); } catch {} }
    const link = document.createElement('a'); link.download = `tamkeenova-certificate-${cert.verification_code}-${language}.png`; link.href = canvas.toDataURL('image/png'); link.click();
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
