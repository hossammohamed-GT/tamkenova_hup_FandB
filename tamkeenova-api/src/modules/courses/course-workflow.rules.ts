import { BadRequestException } from '@nestjs/common';
export function cents(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000)
    throw new BadRequestException('Invalid amount / مبلغ غير صالح');
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)
    throw new BadRequestException('Use at most two decimal places');
  return Math.round(amount * 100);
}
export function requireYoutube(value: string): void {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new Error();
    if (
      ['youtu.be', 'www.youtu.be'].includes(url.hostname) &&
      parts.length === 1
    )
      id = parts[0];
    if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtube-nocookie.com',
        'www.youtube-nocookie.com',
      ].includes(url.hostname)
    ) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (
        parts.length === 2 &&
        ['embed', 'shorts', 'live'].includes(parts[0])
      )
        id = parts[1];
    }
    if (!id || !/^[-\w]{11}$/.test(id)) throw new Error();
  } catch {
    throw new BadRequestException(
      'Use a valid YouTube video URL / أدخل رابط فيديو يوتيوب صحيح',
    );
  }
}
export function requireNote(note?: string): string {
  if (!note?.trim())
    throw new BadRequestException('A reason is required / سبب القرار مطلوب');
  return note.trim();
}
export const transactionOptions = { maxWait: 60000, timeout: 60000 };

export function normalizedReference(value?: string) {
  const result = requireNote(value)
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toUpperCase();
  if (
    result.length < 3 ||
    result.length > 120 ||
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(result)
  )
    throw new BadRequestException(
      'Enter a valid confirmed transaction reference',
    );
  return result;
}
