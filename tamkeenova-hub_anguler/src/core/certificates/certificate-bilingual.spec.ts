import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  bilingualData,
  canRenderCertificate,
  certificateLanguages,
  certificateValues,
  getCertificateTemplate,
  validateValues,
} from './certificate-template';

const data = {
  schema: 'tamkeenova.certificate/2026.3',
  recipient_name_ar: 'ليلى أحمد',
  recipient_name_en: 'Layla Ahmed',
  program_name_ar: 'القيادة',
  program_name_en: 'Leadership',
  signature_name: 'Ahmed Hassan',
};
const record = {
  template_version: '2026.3',
  certificate_type: 'TRAINING',
  certificate_language: 'ar' as const,
  recipient_name: data.recipient_name_ar,
  program_name: data.program_name_ar,
  description: JSON.stringify(data),
  training_hours: 24,
  issued_at: '2026-09-22',
  verification_code: 'TAM-1234567890ABCDEF',
};

describe('paired certificate editions', () => {
  it('always offers both languages from a single saved record', () => {
    expect(certificateLanguages(record)).toEqual(['ar', 'en']);
    expect(certificateLanguages({ ...record, certificate_language: 'en' })).toEqual(['ar', 'en']);
    const ar = certificateValues(record, 'ar'),
      en = certificateValues(record, 'en');
    expect(ar.recipient_name).toBe(data.recipient_name_ar);
    expect(en.recipient_name).toBe(data.recipient_name_en);
    expect(ar.program_name).toBe(data.program_name_ar);
    expect(en.program_name).toBe(data.program_name_en);
    expect(ar.signature_name).toBe(en.signature_name);
    expect(ar.verification_code).toBe(en.verification_code);
    expect(() => validateValues(ar)).not.toThrow();
    expect(() => validateValues(en)).not.toThrow();
  });
  it('rejects missing or corrupt bilingual metadata rather than guessing translations', () => {
    expect(canRenderCertificate({ ...record, description: null })).toBe(false);
    expect(canRenderCertificate({ ...record, description: 'not json' })).toBe(false);
    expect(bilingualData({ ...record, description: '{"schema":"unknown"}' })).toBeNull();
  });
  it('keeps the previous single-language edition unchanged', () => {
    const old = {
      ...record,
      template_version: '2026.2',
      certificate_language: 'en' as const,
      description: null,
    };
    expect(certificateLanguages(old)).toEqual(['en']);
    expect(getCertificateTemplate(certificateValues(old)).artwork).toBe(
      '/certificates/training-en-v2.png',
    );
    expect(getCertificateTemplate(certificateValues(old)).fields.signature).toBeUndefined();
  });
  it.each(['ar', 'en'] as const)(
    'places one signature and partner images at the bottom in %s',
    (language) => {
      const value = certificateValues(record, language),
        template = getCertificateTemplate(value);
      expect(template.fields.signature).toBeDefined();
      expect(template.fields.partners!.y).toBeGreaterThan(
        template.fields.signature!.y + template.fields.signature!.height,
      );
      expect(() => validateValues({ ...value, signature_name: '' })).toThrow();
      expect(() => validateValues({ ...value, signature_name: 'x'.repeat(81) })).toThrow();
      expect(() => validateValues({ ...value, signature_name: 'أحمد حسن' })).not.toThrow();
    },
  );
  it('maps the existing enum to experience artwork without changing the API value', () => {
    const experience = {
      ...record,
      certificate_type: 'VOLUNTEER',
      program_name: null,
      description: JSON.stringify({ ...data, program_name_ar: null, program_name_en: null }),
    };
    expect(certificateValues(experience, 'en').certificate_type).toBe('VOLUNTEER');
    expect(getCertificateTemplate(certificateValues(experience, 'en')).artwork).toBe(
      '/certificates/experience-en-v3.jpg',
    );
  });
});

describe('trainee wording throughout the frontend', () => {
  for (const lang of ['ar', 'en'])
    it(`${lang}: visible translations have no former role wording`, () => {
      const translations = JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8'));
      const strings = (value: any): string[] =>
        typeof value === 'string' ? [value] : Object.values(value).flatMap(strings);
      expect(strings(translations).join(' ')).not.toMatch(/volunteer|متطوع|تطوّ?ع/iu);
      expect(translations.status.user_role.VOLUNTEER).toBe(lang === 'ar' ? 'متدرب' : 'Trainee');
      expect(translations.certificate_studio.VOLUNTEER).toBe(
        lang === 'ar' ? 'شهادة خبرة' : 'Experience certificate',
      );
    });
});
