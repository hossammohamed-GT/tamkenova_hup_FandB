import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import {
  ARTBOARD,
  getCertificateTemplate,
  partnerSlots,
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
        ['CertificateSignature', '/certificates/fonts/signature-400.ttf'],
        ['CertificateCalligraphy', '/certificates/fonts/amiri-400-normal.ttf'],
        ['CertificateSerif', '/certificates/fonts/cormorant-garamond-500-normal.ttf'],
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
    if (this.images.size > 24) this.images.clear();
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
    const template = getCertificateTemplate(values);
    const logos = values.partner_logos ?? [];
    const artworkUrl = logos.length ? template.partnerArtwork! : template.artwork;
    const [artwork, , ...partnerImages] = await Promise.all([
      this.image(artworkUrl),
      this.loadFonts(),
      ...logos.map((logo) => this.image(logo.data_url)),
    ] as const);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round((width * ARTBOARD.height) / ARTBOARD.width);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('certificate_studio.render_error');
    ctx.scale(canvas.width / ARTBOARD.width, canvas.height / ARTBOARD.height);
    // The sole source of fixed wording/branding. Optional partner logos use a reserved band.
    ctx.drawImage(artwork, 0, 0, ARTBOARD.width, ARTBOARD.height);
    this.drawField(
      ctx,
      values.recipient_name,
      template.fields.recipient,
      undefined,
      template.version === '2026.3' ? 'serif' : undefined,
    );
    if (template.fields.program)
      this.drawField(
        ctx,
        values.program_name!,
        template.fields.program,
        undefined,
        template.version === '2026.3' ? 'serif' : undefined,
      );
    if (template.fields.signature)
      this.drawField(
        ctx,
        values.signature_name!,
        template.fields.signature,
        undefined,
        'signature',
      );
    if (template.fields.code)
      this.drawField(ctx, values.verification_code, template.fields.code, 'ltr');
    const digits = (value: string) =>
      template.language === 'ar'
        ? value.replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
        : value;
    this.drawField(ctx, digits(String(values.training_hours)), template.fields.hours, 'ltr');
    this.drawField(ctx, digits(values.issued_at.slice(0, 10)), template.fields.date, 'ltr');
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
    ctx.imageSmoothingEnabled = true;
    partnerSlots(template, logos.length).forEach((slot, index) => {
      const image = partnerImages[index]!;
      const scale = Math.min(slot.width / image.naturalWidth, slot.height / image.naturalHeight);
      const w = image.naturalWidth * scale,
        h = image.naturalHeight * scale;
      ctx.drawImage(image, slot.x + (slot.width - w) / 2, slot.y + (slot.height - h) / 2, w, h);
    });
    return canvas;
  }

  private drawField(
    ctx: CanvasRenderingContext2D,
    text: string,
    box: FieldBox,
    direction?: CanvasDirection,
    style?: 'signature' | 'serif',
  ): void {
    const isArabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(text);
    const family =
      style === 'signature'
        ? isArabic
          ? 'CertificateCalligraphy'
          : 'CertificateSignature'
        : style === 'serif' && !isArabic
          ? 'CertificateSerif'
          : /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(text)
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
    ctx.fillStyle = style === 'signature' ? '#152734' : style === 'serif' ? '#102c40' : '#004265';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = direction ?? (/[\u0600-\u06ff]/u.test(text) ? 'rtl' : 'ltr');
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

  async downloadPair(values: CertificateValues[]): Promise<void> {
    if (values.length === 1) return this.download(values[0]);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    for (let i = 0; i < values.length; i++) {
      const canvas = await this.render(values[i], 3508);
      if (i) pdf.addPage('a4', 'landscape');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, 297, 210);
    }
    pdf.setProperties({ title: 'Tamkeenova — Arabic & English', creator: 'Tamkeenova' });
    pdf.save(`tamkeenova-bilingual-${values[0].verification_code}.pdf`);
  }

  async download(values: CertificateValues, format: 'png' | 'pdf' = 'pdf'): Promise<void> {
    const canvas = await this.render(values, 3508);
    const language = getCertificateTemplate(values).language;
    const filename = `tamkeenova-${values.certificate_type === 'VOLUNTEER' && values.template_version === '2026.3' ? 'experience' : values.certificate_type.toLowerCase()}-${language ? `${language}-` : ''}${values.verification_code}`;
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pdf.setProperties({ title: `${values.recipient_name} — Tamkeenova`, creator: 'Tamkeenova' });
      const textured = values.template_version === '2026.3';
      pdf.addImage(
        canvas.toDataURL(textured ? 'image/jpeg' : 'image/png', 0.97),
        textured ? 'JPEG' : 'PNG',
        0,
        0,
        297,
        210,
      );
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
