import { describe, expect, it } from 'vitest';
import {
  getCertificateTemplate,
  partnerSlots,
  ARTBOARD,
  CERTIFICATE_TEMPLATES,
  CertificateValues,
  certificateValues,
  fitText,
  validateValues,
} from './certificate-template';

const training: CertificateValues = {
  signature_name: 'Ahmed Hassan',
  certificate_type: 'TRAINING',
  certificate_language: 'en',
  recipient_name: 'ليلى أحمد محمد',
  program_name: 'Leadership & Professional Development',
  training_hours: 24,
  issued_at: '2026-09-21',
  verification_code: 'TAM-1234567890ABCDEF',
};
describe('fixed certificate templates', () => {
  it('has separate Arabic and English editions for both types', () => {
    expect(CERTIFICATE_TEMPLATES.map((t) => `${t.type}-${t.language}`)).toEqual([
      'TRAINING-ar',
      'TRAINING-en',
      'VOLUNTEER-ar',
      'VOLUNTEER-en',
    ]);
    expect(Object.keys(CERTIFICATE_TEMPLATES[0].fields).sort()).toEqual([
      'code',
      'date',
      'hours',
      'partners',
      'program',
      'qr',
      'recipient',
      'signature',
    ]);
    expect(Object.keys(CERTIFICATE_TEMPLATES[2].fields).sort()).toEqual([
      'code',
      'date',
      'hours',
      'partners',
      'qr',
      'recipient',
      'signature',
    ]);
  });
  it('mirrors Arabic field locations without mirroring content', () => {
    const ar = CERTIFICATE_TEMPLATES[0],
      en = CERTIFICATE_TEMPLATES[1];
    expect(ar.fields.recipient.x).toBe(1800 - en.fields.recipient.x - en.fields.recipient.width);
    expect(ar.fields.qr.x).toBe(1800 - en.fields.qr.x - en.fields.qr.width);
  });
  it.each([0, 1, 2, 3, 4])('fits %i logos in the partner band, in reading order', (count) => {
    for (const template of CERTIFICATE_TEMPLATES) {
      const slots = partnerSlots(template, count),
        area = template.fields.partners!;
      expect(slots).toHaveLength(count);
      for (const slot of slots) {
        expect(slot.x).toBeGreaterThanOrEqual(area.x);
        expect(slot.x + slot.width).toBeLessThanOrEqual(area.x + area.width);
        expect(slot.height).toBeLessThanOrEqual(area.height);
      }
      if (count > 1) expect(slots[0].x < slots[1].x).toBe(template.language === 'en');
      expect(() => partnerSlots(template, 5)).toThrow();
    }
  });
  it('retains the original bilingual layout for 2026.1 records', () => {
    const value = certificateValues({
      ...training,
      template_version: '2026.1',
      certificate_language: null,
    });
    const template = getCertificateTemplate(value);
    expect(template.artwork).toBe('/certificates/training-v1.png');
    expect(template.fields.recipient.y).toBe(533);
    expect(() => validateValues(value)).not.toThrow();
  });
  it('keeps every editable rectangle inside the artboard without intersections', () => {
    for (const template of CERTIFICATE_TEMPLATES) {
      const boxes = Object.values(template.fields);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(ARTBOARD.width);
        expect(box.y + box.height).toBeLessThanOrEqual(ARTBOARD.height);
        for (const other of boxes.filter((b) => b !== box)) {
          expect(
            box.x >= other.x + other.width ||
              other.x >= box.x + box.width ||
              box.y >= other.y + other.height ||
              other.y >= box.y + box.height,
          ).toBe(true);
        }
      }
    }
  });
  it('accepts Arabic/English training and volunteer values', () => {
    expect(() => validateValues(training)).not.toThrow();
    expect(() =>
      validateValues({ ...training, certificate_type: 'VOLUNTEER', program_name: null }),
    ).not.toThrow();
  });
  it.each([
    { recipient_name: '   ' },
    { recipient_name: 'a'.repeat(121) },
    { recipient_name: 'Name\u202eabc' },
    { program_name: '' },
    { training_hours: -1 },
    { training_hours: 1.5 },
    { training_hours: 100001 },
    { issued_at: '2026-02-30' },
    { issued_at: '1899-01-01' },
    { issued_at: 'not-a-date' },
    { verification_code: 'https://evil.example' },
    { certificate_type: 'OTHER' },
    { certificate_language: undefined },
    { certificate_language: 'fr' },
    { certificate_type: 'VOLUNTEER', program_name: 'Not permitted' },
  ])('rejects invalid values: %j', (patch) => {
    expect(() => validateValues({ ...training, ...patch } as CertificateValues)).toThrow(
      'certificate_studio.invalid',
    );
  });
  it('never silently converts old records to training templates', () => {
    expect(() => certificateValues({ ...training, template_version: null })).toThrow(
      'certificate_studio.legacy',
    );
    expect(() =>
      certificateValues({ ...training, template_version: '2026.1', certificate_type: 'OTHER' }),
    ).toThrow();
    expect(certificateValues({ ...training, template_version: '2026.1' }).recipient_name).toBe(
      training.recipient_name,
    );
  });
  it('wraps and reduces long text without truncation', () => {
    const text = 'A long recipient name with several family names';
    const box = { x: 0, y: 0, width: 300, height: 120, fontSize: 50, minFontSize: 15, lines: 2 };
    const fitted = fitText(text, box, (t, size) => t.length * size * 0.5);
    expect(fitted.lines.join(' ')).toBe(text);
    expect(fitted.lines.length).toBeLessThanOrEqual(2);
    expect(fitted.size).toBeLessThan(50);
    expect(fitted.lines.every((t) => t.length * fitted.size * 0.5 <= box.width)).toBe(true);
    expect(() => fitText('W'.repeat(120), box, (t, size) => t.length * size)).toThrow(
      'certificate_studio.too_long',
    );
  });
});
