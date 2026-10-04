import { BadRequestException } from '@nestjs/common';
import { PNG } from 'pngjs';

export type CertificatePartnerLogo = {
  name: string;
  data_url: string;
  source_id?: string;
};
export const MAX_CERTIFICATE_LOGOS = 4;
export const MAX_LOGO_DATA_LENGTH = 90000;

/** Validate and normalize image bytes, without fetching ANY remote URL. */
export function certificateLogos(input: unknown): CertificatePartnerLogo[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_CERTIFICATE_LOGOS)
    throw new BadRequestException('Select at most four partner logos');
  const seen = new Set<string>();
  return input.map((logo: CertificatePartnerLogo) => {
    if (
      !logo ||
      typeof logo.name !== 'string' ||
      !logo.name.trim() ||
      logo.name.length > 80 ||
      /[\u0000-\u001f\u007f]/u.test(logo.name) ||
      typeof logo.data_url !== 'string' ||
      logo.data_url.length > MAX_LOGO_DATA_LENGTH ||
      !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(logo.data_url)
    )
      throw new BadRequestException('Invalid partner logo');
    const bytes = Buffer.from(
      logo.data_url.slice('data:image/png;base64,'.length),
      'base64',
    );
    // Check dimensions BEFORE PNG decompression to bound allocations.
    if (
      bytes.length < 33 ||
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.toString('ascii', 12, 16) !== 'IHDR' ||
      bytes.readUInt32BE(8) !== 13 ||
      bytes.readUInt32BE(16) < 1 ||
      bytes.readUInt32BE(16) > 512 ||
      bytes.readUInt32BE(20) < 1 ||
      bytes.readUInt32BE(20) > 256
    )
      throw new BadRequestException(
        'Partner logo must be a PNG no larger than 512 × 256',
      );
    let data_url: string;
    try {
      const png = PNG.sync.read(bytes, { checkCRC: true });
      // Re-encoding discards arbitrary metadata and ensures a complete decodable image.
      data_url =
        'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
    } catch {
      throw new BadRequestException('Corrupt partner logo');
    }
    if (data_url.length > MAX_LOGO_DATA_LENGTH || seen.has(data_url))
      throw new BadRequestException(
        'Partner logos must be distinct and within the size limit',
      );
    seen.add(data_url);
    return {
      name: logo.name.trim(),
      data_url,
      ...(logo.source_id ? { source_id: logo.source_id } : {}),
    };
  });
}
