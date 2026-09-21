import { describe, expect, it } from 'vitest';
import {
  ARTBOARD,
  CERTIFICATE_TEMPLATES,
  CertificateValues,
  certificateValues,
  fitText,
  validateValues,
} from './certificate-template';

const training: CertificateValues = {
  certificate_type: 'TRAINING',
  recipient_name: 'ليلى أحمد محمد',
  program_name: 'Leadership & Professional Development',
  training_hours: 24,
  issued_at: '2026-09-21',
  verification_code: 'TAM-1234567890ABCDEF',
};
describe('fixed certificate templates', () => {
  it('has exactly two templates and only permitted dynamic field boxes', () => {
    expect(CERTIFICATE_TEMPLATES.map((t) => t.type)).toEqual(['TRAINING', 'VOLUNTEER']);
    expect(Object.keys(CERTIFICATE_TEMPLATES[0].fields).sort()).toEqual([
      'date',
      'hours',
      'program',
      'qr',
      'recipient',
    ]);
    expect(Object.keys(CERTIFICATE_TEMPLATES[1].fields).sort()).toEqual([
      'date',
      'hours',
      'qr',
      'recipient',
    ]);
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
