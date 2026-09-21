export type TemplateType = 'TRAINING' | 'VOLUNTEER';
export const TEMPLATE_VERSION = '2026.1';
export const ARTBOARD = { width: 1800, height: 1273 } as const;
export interface FieldBox {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  minFontSize: number;
  lines: number;
}
export interface CertificateTemplate {
  type: TemplateType;
  artwork: string;
  thumbnail: string;
  fields: {
    recipient: FieldBox;
    program?: FieldBox;
    hours: FieldBox;
    date: FieldBox;
    qr: { x: number; y: number; width: number; height: number };
  };
}
// Coordinates are in the artwork's immutable 1800 × 1273 design space.
const shared = {
  recipient: { x: 280, y: 533, width: 1330, height: 100, fontSize: 58, minFontSize: 29, lines: 2 },
  hours: { x: 270, y: 938, width: 260, height: 65, fontSize: 42, minFontSize: 28, lines: 1 },
  date: { x: 610, y: 938, width: 310, height: 65, fontSize: 34, minFontSize: 26, lines: 1 },
  qr: { x: 1394, y: 929, width: 172, height: 172 },
} as const;
export const CERTIFICATE_TEMPLATES: readonly CertificateTemplate[] = [
  {
    type: 'TRAINING',
    artwork: '/certificates/training-v1.png',
    thumbnail: '/certificates/training-v1-thumb.png',
    fields: {
      ...shared,
      program: {
        x: 290,
        y: 762,
        width: 1310,
        height: 108,
        fontSize: 38,
        minFontSize: 24,
        lines: 2,
      },
    },
  },
  {
    type: 'VOLUNTEER',
    artwork: '/certificates/volunteer-v1.png',
    thumbnail: '/certificates/volunteer-v1-thumb.png',
    fields: { ...shared },
  },
];
export interface CertificateValues {
  certificate_type: TemplateType;
  recipient_name: string;
  program_name?: string | null;
  training_hours: number;
  issued_at: string;
  verification_code: string;
}
export interface RenderableCertificate {
  certificate_type?: string | null;
  template_version?: string | null;
  recipient_name?: string | null;
  program_name?: string | null;
  training_hours: number | null;
  issued_at: string;
  verification_code: string;
}
export function certificateValues(record: RenderableCertificate): CertificateValues {
  if (
    record.template_version !== TEMPLATE_VERSION ||
    !record.recipient_name ||
    !['TRAINING', 'VOLUNTEER'].includes(record.certificate_type ?? '')
  ) {
    throw new Error('certificate_studio.legacy');
  }
  return {
    ...record,
    certificate_type: record.certificate_type as TemplateType,
    recipient_name: record.recipient_name,
    training_hours: record.training_hours ?? 0,
  };
}
export function validateValues(value: CertificateValues): void {
  const validText = (s: unknown, max: number) =>
    typeof s === 'string' &&
    s.trim().length > 0 &&
    s.length <= max &&
    !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(s);
  const date = value.issued_at.slice(0, 10);
  if (
    !CERTIFICATE_TEMPLATES.some((t) => t.type === value.certificate_type) ||
    !validText(value.recipient_name, 120) ||
    (value.certificate_type === 'TRAINING' && !validText(value.program_name, 180)) ||
    (value.certificate_type === 'VOLUNTEER' && !!value.program_name) ||
    !Number.isInteger(value.training_hours) ||
    value.training_hours < 1 ||
    value.training_hours > 100000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < '1900-01-01' ||
    date > '2100-12-31' ||
    !/^[A-Za-z0-9-]{1,64}$/.test(value.verification_code)
  ) {
    throw new Error('certificate_studio.invalid');
  }
}
// Pure layout function, shared by preview/export and tested independently of canvas.
export function fitText(
  value: string,
  box: FieldBox,
  measure: (text: string, size: number) => number,
): { lines: string[]; size: number } {
  const text = value.trim().replace(/\s+/g, ' ');
  for (let size = box.fontSize; size >= box.minFontSize; size--) {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate, size) > box.width) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    if (
      lines.length <= box.lines &&
      lines.length * size * 1.5 <= box.height &&
      lines.every((l) => measure(l, size) <= box.width)
    )
      return { lines, size };
  }
  // Never truncate official names or paint outside the designated box.
  throw new Error('certificate_studio.too_long');
}
