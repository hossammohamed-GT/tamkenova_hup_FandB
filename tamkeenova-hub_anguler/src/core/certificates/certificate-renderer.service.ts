import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import {
  ARTBOARD,
  CERTIFICATE_TEMPLATES,
  CertificateValues,
  FieldBox,
  fitText,
  validateValues,
} from './certificate-template';

@Injectable({ providedIn: 'root' })
export class CertificateRenderer {
  private fonts?: Promise<void>;
  private images = new Map<string, Promise<HTMLImageElement>>();

  private loadFonts(): Promise<void> {
    return (this.fonts ??= Promise.all(
      [
        ['CertificateLatin', '/certificates/fonts/manrope-600-normal.ttf'],
        ['CertificateArabic', '/certificates/fonts/noto-sans-arabic-600-normal.ttf'],
      ].map(async ([name, url]) => {
        const face = await new FontFace(name, `url(${url})`).load();
        document.fonts.add(face);
      }),
    )
      .then(() => undefined)
      .catch((error) => {
        this.fonts = undefined;
        throw error;
      }));
  }

  private image(url: string): Promise<HTMLImageElement> {
    if (!this.images.has(url))
      this.images.set(
        url,
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => {
            this.images.delete(url);
            reject(new Error('certificate_studio.render_error'));
          };
          image.src = url;
        }),
      );
    return this.images.get(url)!;
  }

  async render(values: CertificateValues, width = 1800): Promise<HTMLCanvasElement> {
    validateValues(values);
    const template = CERTIFICATE_TEMPLATES.find((t) => t.type === values.certificate_type)!;
    const [artwork] = await Promise.all([this.image(template.artwork), this.loadFonts()]);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round((width * ARTBOARD.height) / ARTBOARD.width);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('certificate_studio.render_error');
    ctx.scale(canvas.width / ARTBOARD.width, canvas.height / ARTBOARD.height);
    // The sole source of fixed content. No fallback, extra labels, logos or signatures.
    ctx.drawImage(artwork, 0, 0, ARTBOARD.width, ARTBOARD.height);
    this.drawField(ctx, values.recipient_name, template.fields.recipient);
    if (template.fields.program) this.drawField(ctx, values.program_name!, template.fields.program);
    this.drawField(ctx, String(values.training_hours), template.fields.hours);
    this.drawField(ctx, values.issued_at.slice(0, 10), template.fields.date);
    const url = new URL('/verify', window.location.origin);
    url.searchParams.set('code', values.verification_code);
    // Four-module quiet zone. Generated locally, never sent to an external QR service.
    const qr = await QRCode.toCanvas(url.href, {
      width: 512,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#004265', light: '#ffffff' },
    });
    const box = template.fields.qr;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, box.x, box.y, box.width, box.height);
    return canvas;
  }

  private drawField(ctx: CanvasRenderingContext2D, text: string, box: FieldBox): void {
    const family = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(text)
      ? 'CertificateArabic, CertificateLatin'
      : 'CertificateLatin, CertificateArabic';
    const fitted = fitText(text, box, (line, size) => {
      ctx.font = `${size}px ${family}`;
      return ctx.measureText(line).width;
    });
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
    ctx.font = `${fitted.size}px ${family}`;
    ctx.fillStyle = '#004265';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = /[\u0600-\u06ff]/u.test(text) ? 'rtl' : 'ltr';
    const lineHeight = fitted.size * 1.5;
    fitted.lines.forEach((line, i) =>
      ctx.fillText(
        line,
        box.x + box.width / 2,
        box.y + box.height / 2 + (i - (fitted.lines.length - 1) / 2) * lineHeight,
      ),
    );
    ctx.restore();
  }

  async download(values: CertificateValues, format: 'png' | 'pdf' = 'pdf'): Promise<void> {
    const canvas = await this.render(values, 3508);
    const filename = `tamkeenova-${values.certificate_type.toLowerCase()}-${values.verification_code}`;
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.setProperties({ title: `${values.recipient_name} — Tamkeenova`, creator: 'Tamkeenova' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
      pdf.save(`${filename}.pdf`);
      return;
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('certificate_studio.render_error'))),
        'image/png',
      ),
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
