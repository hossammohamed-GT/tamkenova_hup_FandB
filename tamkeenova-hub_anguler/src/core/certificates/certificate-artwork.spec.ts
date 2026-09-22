import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CERTIFICATE_TEMPLATES } from './certificate-template';

describe('monolingual fixed artwork', () => {
  for (const template of CERTIFICATE_TEMPLATES) {
    it(`${template.type} ${template.language} uses only its selected language in every fixed text`, () => {
      const svg = readFileSync(`public${template.artwork.replace(/\.png$/, '.svg')}`, 'utf8');
      const labels = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)]
        .map((match) => match[1])
        .join(' ');
      expect(labels.length).toBeGreaterThan(80);
      if (template.language === 'ar') expect(labels).not.toMatch(/[A-Za-z]/);
      else expect(labels).not.toMatch(/[\u0600-\u06ff]/);
      const partners = readFileSync(
        `public${template.partnerArtwork!.replace(/\.png$/, '.svg')}`,
        'utf8',
      );
      expect(partners).toContain(
        template.language === 'ar' ? 'بالشراكة مع' : 'IN COLLABORATION WITH',
      );
      expect(svg).not.toContain(
        template.language === 'ar' ? 'بالشراكة مع' : 'IN COLLABORATION WITH',
      );
    });
  }
});
