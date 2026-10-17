import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export function assertSafeImage(
  file: Express.Multer.File,
  maxBytes = 5 * 1024 * 1024,
) {
  if (!file?.buffer?.length) {
    throw new BadRequestException('No file provided');
  }
  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    throw new BadRequestException('File size must not exceed 5MB');
  }
  const mime = sniffImageMime(file.buffer);
  if (
    !mime ||
    !IMAGE_TYPES.has(file.mimetype) ||
    !IMAGE_TYPES.has(mime) ||
    file.mimetype.replace('image/jpg', 'image/jpeg') !== mime
  ) {
    throw new BadRequestException('Only JPG, PNG, and WEBP images are allowed');
  }
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

export function sniffImageMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
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
    contentType === 'image/jpeg'
      ? '.jpg'
      : contentType === 'image/png'
        ? '.png'
        : contentType === 'image/webp'
          ? '.webp'
          : contentType === 'application/pdf'
            ? '.pdf'
            : contentType === 'application/msword'
              ? '.doc'
              : contentType.includes('word')
                ? '.docx'
                : '.bin';
  return `${randomUUID()}${ext}`;
}

export function assertSafeAttachment(
  buffer: Buffer,
  contentType: string,
): void {
  if (!buffer?.length || buffer.length > 10 * 1024 * 1024)
    throw new BadRequestException('File must be between 1 byte and 10MB');
  const image = sniffImageMime(buffer);
  const mime = contentType.replace('image/jpg', 'image/jpeg');
  const isPdf =
    mime === 'application/pdf' &&
    buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  const isDoc =
    mime === 'application/msword' &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]));
  const isDocx =
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    buffer.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])) &&
    buffer.includes(Buffer.from('[Content_Types].xml')) &&
    buffer.includes(Buffer.from('word/'));
  if (!(image === mime || isPdf || isDoc || isDocx))
    throw new BadRequestException(
      'Only valid PDF, DOC, DOCX, JPG, PNG and WEBP files are allowed',
    );
}
