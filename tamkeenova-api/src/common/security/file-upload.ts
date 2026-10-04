import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function assertSafeImage(file: Express.Multer.File, maxBytes = 5 * 1024 * 1024) {
  if (!file?.buffer?.length) {
    throw new BadRequestException('No file provided');
  }
  if (file.size > maxBytes) {
    throw new BadRequestException('File size must not exceed 5MB');
  }
  const mime = sniffImageMime(file.buffer);
  if (!mime || !IMAGE_TYPES.has(file.mimetype) || !IMAGE_TYPES.has(mime)) {
    throw new BadRequestException('Only JPG, PNG, and WEBP images are allowed');
  }
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function safeStorageName(contentType: string): string {
  const ext =
    contentType === 'image/png'
      ? '.png'
      : contentType === 'image/webp'
        ? '.webp'
        : contentType === 'application/pdf'
          ? '.pdf'
          : contentType.includes('word')
            ? '.docx'
            : '.bin';
  return `${randomUUID()}${ext}`;
}
