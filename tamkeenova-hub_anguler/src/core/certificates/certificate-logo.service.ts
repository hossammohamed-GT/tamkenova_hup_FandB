import { Injectable } from '@angular/core';
import { MAX_PARTNER_DATA_LENGTH, PartnerLogo } from './certificate-template';

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
@Injectable({ providedIn: 'root' })
export class CertificateLogoService {
  async fromFile(file: File): Promise<PartnerLogo> {
    return this.snapshot(file, file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Partner');
  }

  async fromLibrary(url: string, name: string, source_id: string): Promise<PartnerLogo> {
    // Only browser-side CORS fetches. The API never fetches administrator-supplied URLs.
    const parsed = new URL(url, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol))
      throw new Error('certificate_studio.partner_load_error');
    const response = await fetch(parsed.href, {
      mode: 'cors',
      credentials: 'omit',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || !response.body) throw new Error('certificate_studio.partner_load_error');
    const reader = response.body.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_SOURCE_BYTES) throw new Error('certificate_studio.partner_invalid');
        parts.push(new Uint8Array(value));
      }
    } finally {
      await reader.cancel();
    }
    const result = await this.snapshot(
      new Blob(parts, { type: response.headers.get('content-type')?.split(';')[0] ?? '' }),
      name,
    );
    return { ...result, source_id };
  }

  private async snapshot(blob: Blob, name: string): Promise<PartnerLogo> {
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) ||
      !blob.size ||
      blob.size > MAX_SOURCE_BYTES
    )
      throw new Error('certificate_studio.partner_invalid');
    let image: ImageBitmap;
    try {
      image = await createImageBitmap(blob);
    } catch {
      throw new Error('certificate_studio.partner_invalid');
    }
    try {
      if (image.width * image.height > 16000000)
        throw new Error('certificate_studio.partner_invalid');
      // Remove ONLY transparent outer padding; never crop visible logo content.
      // A bounded probe keeps memory use independent of a large source image.
      const probe = document.createElement('canvas');
      const probeScale = Math.min(1, 1024 / image.width, 1024 / image.height);
      probe.width = Math.max(1, Math.round(image.width * probeScale));
      probe.height = Math.max(1, Math.round(image.height * probeScale));
      const probeContext = probe.getContext('2d');
      if (!probeContext) throw new Error('certificate_studio.partner_invalid');
      probeContext.drawImage(image, 0, 0, probe.width, probe.height);
      const pixels = probeContext.getImageData(0, 0, probe.width, probe.height).data;
      let left = probe.width,
        top = probe.height,
        right = -1,
        bottom = -1;
      for (let y = 0; y < probe.height; y++)
        for (let x = 0; x < probe.width; x++) {
          if (pixels[(y * probe.width + x) * 4 + 3] > 0) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      if (right < left) throw new Error('certificate_studio.partner_invalid');
      left = Math.max(0, left - 3);
      top = Math.max(0, top - 3);
      right = Math.min(probe.width, right + 4);
      bottom = Math.min(probe.height, bottom + 4);
      const sx = (left * image.width) / probe.width,
        sy = (top * image.height) / probe.height;
      const sourceWidth = ((right - left) * image.width) / probe.width,
        sourceHeight = ((bottom - top) * image.height) / probe.height;
      // Rasterize into a small, self-contained PNG: no SVG scripts, remote resources,
      // expiring URLs, metadata or future partner-library changes in issued certificates.
      for (const width of [512, 384, 256]) {
        const scale = Math.min(1, width / sourceWidth, width / 2 / sourceHeight);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('certificate_studio.partner_invalid');
        ctx.drawImage(image, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
        const data_url = canvas.toDataURL('image/png');
        if (data_url.length <= MAX_PARTNER_DATA_LENGTH)
          return { name: name.trim().slice(0, 80) || 'Partner', data_url };
      }
      throw new Error('certificate_studio.partner_invalid');
    } finally {
      image.close();
    }
  }
}
