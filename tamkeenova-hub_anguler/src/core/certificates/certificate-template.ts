export type TemplateType = 'TRAINING' | 'VOLUNTEER';
export const TEMPLATE_VERSION = '2026.3';
export type CertificateLanguage = 'ar' | 'en';
export const MAX_PARTNER_LOGOS = 4;
export const MAX_PARTNER_DATA_LENGTH = 90000;
export interface PartnerLogo {
  name: string;
  data_url: string;
  source_id?: string;
}
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
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
  language: CertificateLanguage | null;
  version: string;
  partnerArtwork?: string;
  artwork: string;
  thumbnail: string;
  fields: {
    signature?: FieldBox;
    code?: FieldBox;
    partners?: Rectangle;
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
const LEGACY_TEMPLATES: readonly CertificateTemplate[] = [
  {
    version: '2026.1',
    language: null,
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
    version: '2026.1',
    language: null,
    type: 'VOLUNTEER',
    artwork: '/certificates/volunteer-v1.png',
    thumbnail: '/certificates/volunteer-v1-thumb.png',
    fields: { ...shared },
  },
];
const V2_TEMPLATES: readonly CertificateTemplate[] = (['TRAINING', 'VOLUNTEER'] as const).flatMap(
  (type) =>
    (['ar', 'en'] as const).map((language) => {
      const training = type === 'TRAINING';
      const stem = `/certificates/${type.toLowerCase()}-${language}-v2`;
      const mirror = <T extends Rectangle>(box: T): T =>
        language === 'ar' ? { ...box, x: ARTBOARD.width - box.x - box.width } : box;
      return {
        type,
        language,
        version: '2026.2',
        artwork: `${stem}.png`,
        partnerArtwork: `${stem}-partners.png`,
        thumbnail: `${stem}-thumb.png`,
        fields: {
          recipient: mirror({
            x: training ? 405 : 220,
            y: 467,
            width: training ? 1260 : 1360,
            height: 120,
            fontSize: 64,
            minFontSize: 30,
            lines: 2,
          }),
          ...(training
            ? {
                program: mirror({
                  x: 425,
                  y: 671,
                  width: 1220,
                  height: 105,
                  fontSize: 40,
                  minFontSize: 24,
                  lines: 2,
                }),
              }
            : {}),
          hours: mirror({
            x: training ? 435 : 305,
            y: 887,
            width: 240,
            height: 70,
            fontSize: 44,
            minFontSize: 26,
            lines: 1,
          }),
          date: mirror({
            x: training ? 750 : 600,
            y: 887,
            width: 310,
            height: 70,
            fontSize: 33,
            minFontSize: 25,
            lines: 1,
          }),
          qr: mirror({ x: training ? 1465 : 1385, y: 868, width: 164, height: 164 }),
          partners: mirror({ x: training ? 440 : 305, y: 1131, width: 1190, height: 82 }),
        },
      };
    }),
);
export const CERTIFICATE_TEMPLATES: readonly CertificateTemplate[] = (
  ['TRAINING', 'VOLUNTEER'] as const
).flatMap((type) =>
  (['ar', 'en'] as const).map((language) => {
    const stem = `/certificates/${type === 'TRAINING' ? 'training' : 'experience'}-${language}-v3`;
    const mirror = <T extends Rectangle>(box: T): T =>
      language === 'ar' ? { ...box, x: 1800 - box.x - box.width } : box;
    return {
      type,
      language,
      version: TEMPLATE_VERSION,
      artwork: `${stem}.jpg`,
      partnerArtwork: `${stem}-partners.jpg`,
      thumbnail: `${stem}-thumb.jpg`,
      fields: {
        recipient: {
          x: 340,
          y: 470,
          width: 1120,
          height: 118,
          fontSize: 74,
          minFontSize: 30,
          lines: 2,
        },
        ...(type === 'TRAINING'
          ? {
              program: {
                x: 390,
                y: 653,
                width: 1020,
                height: 90,
                fontSize: 44,
                minFontSize: 25,
                lines: 2,
              },
            }
          : {}),
        date: mirror({
          x: 370,
          y: 858,
          width: 300,
          height: 66,
          fontSize: 31,
          minFontSize: 23,
          lines: 1,
        }),
        hours: mirror({
          x: 760,
          y: 858,
          width: 220,
          height: 66,
          fontSize: 36,
          minFontSize: 25,
          lines: 1,
        }),
        code: mirror({
          x: 1080,
          y: 858,
          width: 350,
          height: 66,
          fontSize: 23,
          minFontSize: 16,
          lines: 1,
        }),
        signature: {
          x: 585,
          y: 941,
          width: 630,
          height: 128,
          fontSize: 88,
          minFontSize: 36,
          lines: 1,
        },
        qr: mirror({ x: 1240, y: 949, width: 142, height: 142 }),
        partners: { x: 530, y: 1152, width: 740, height: 64 },
      },
    };
  }),
);
export interface BilingualCertificateData {
  schema: 'tamkeenova.certificate/2026.3';
  recipient_name_ar: string;
  recipient_name_en: string;
  program_name_ar: string | null;
  program_name_en: string | null;
  signature_name: string;
}
export function bilingualData(record: {
  template_version?: string | null;
  description?: string | null;
}): BilingualCertificateData | null {
  if (record.template_version !== TEMPLATE_VERSION) return null;
  try {
    const value = JSON.parse(record.description ?? '');
    return value?.schema === 'tamkeenova.certificate/2026.3' &&
      typeof value.recipient_name_ar === 'string' &&
      typeof value.recipient_name_en === 'string' &&
      typeof value.signature_name === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}
export function certificateLanguages(record: RenderableCertificate): CertificateLanguage[] {
  return record.template_version === TEMPLATE_VERSION
    ? ['ar', 'en']
    : [record.certificate_language ?? 'ar'];
}
export function getCertificateTemplate(
  value: Pick<CertificateValues, 'certificate_type' | 'certificate_language' | 'template_version'>,
): CertificateTemplate {
  const version = value.template_version ?? TEMPLATE_VERSION;
  const template = [...CERTIFICATE_TEMPLATES, ...V2_TEMPLATES, ...LEGACY_TEMPLATES].find(
    (t) =>
      t.version === version &&
      t.type === value.certificate_type &&
      (version === '2026.1' || t.language === value.certificate_language),
  );
  if (!template) throw new Error('certificate_studio.legacy');
  return template;
}
export function canRenderCertificate(record: RenderableCertificate): boolean {
  return (
    !!record.recipient_name &&
    ['TRAINING', 'VOLUNTEER'].includes(record.certificate_type ?? '') &&
    (record.template_version === '2026.1' ||
      (record.template_version === '2026.2' &&
        ['ar', 'en'].includes(record.certificate_language ?? '')) ||
      (record.template_version === TEMPLATE_VERSION && !!bilingualData(record)))
  );
}
export function partnerSlots(template: CertificateTemplate, count: number): Rectangle[] {
  if (count === 0) return [];
  const area = template.fields.partners;
  if (!area || !Number.isInteger(count) || count < 0 || count > MAX_PARTNER_LOGOS)
    throw new Error('certificate_studio.partner_limit');
  const gap = 40,
    width = Math.min(230, (area.width - gap * (count - 1)) / count);
  const start = area.x + (area.width - (width * count + gap * (count - 1))) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: start + (template.language === 'ar' ? count - index - 1 : index) * (width + gap),
    y: area.y,
    width,
    height: area.height,
  }));
}
export interface CertificateValues {
  signature_name?: string;
  template_version?: string;
  certificate_language?: CertificateLanguage | null;
  partner_logos?: PartnerLogo[];
  certificate_type: TemplateType;
  recipient_name: string;
  program_name?: string | null;
  training_hours: number;
  issued_at: string;
  verification_code: string;
}
export interface RenderableCertificate {
  description?: string | null;
  certificate_language?: CertificateLanguage | null;
  partner_logos?: PartnerLogo[] | null;
  certificate_type?: string | null;
  template_version?: string | null;
  recipient_name?: string | null;
  program_name?: string | null;
  training_hours: number | null;
  issued_at: string;
  verification_code: string;
}
export function certificateValues(
  record: RenderableCertificate,
  language?: CertificateLanguage,
): CertificateValues {
  if (!canRenderCertificate(record)) throw new Error('certificate_studio.legacy');
  const dual = bilingualData(record);
  const selected = language ?? record.certificate_language ?? 'ar';
  return {
    ...record,
    ...(dual
      ? {
          certificate_language: selected,
          recipient_name: selected === 'ar' ? dual.recipient_name_ar : dual.recipient_name_en,
          program_name: selected === 'ar' ? dual.program_name_ar : dual.program_name_en,
          signature_name: dual.signature_name,
        }
      : {}),
    template_version: record.template_version!,
    partner_logos: record.template_version === '2026.1' ? [] : (record.partner_logos ?? []),
    certificate_type: record.certificate_type as TemplateType,
    recipient_name: dual
      ? selected === 'ar'
        ? dual.recipient_name_ar
        : dual.recipient_name_en
      : record.recipient_name!,
    training_hours: record.training_hours ?? 0,
  };
}
export function validateValues(value: CertificateValues): void {
  let template: CertificateTemplate;
  try {
    template = getCertificateTemplate(value);
  } catch {
    throw new Error('certificate_studio.invalid');
  }
  const logos = value.partner_logos ?? [];
  if (
    !Array.isArray(logos) ||
    logos.length > MAX_PARTNER_LOGOS ||
    (logos.length && !template.fields.partners) ||
    logos.some(
      (logo) =>
        !logo ||
        typeof logo.name !== 'string' ||
        !logo.name.trim() ||
        logo.name.length > 80 ||
        typeof logo.data_url !== 'string' ||
        logo.data_url.length > MAX_PARTNER_DATA_LENGTH ||
        !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(logo.data_url),
    )
  )
    throw new Error('certificate_studio.partner_invalid');

  const validText = (s: unknown, max: number) =>
    typeof s === 'string' &&
    s.trim().length > 0 &&
    s.length <= max &&
    !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(s);
  const date = value.issued_at.slice(0, 10);
  if (
    !template ||
    !validText(value.recipient_name, 120) ||
    (template.version === TEMPLATE_VERSION && !validText(value.signature_name, 80)) ||
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
