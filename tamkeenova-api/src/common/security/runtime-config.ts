export function validateRuntimeConfig(
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (values['NODE_ENV'] === 'production') {
    const secret = values['JWT_SECRET'];
    if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new Error('Production JWT_SECRET must contain at least 32 bytes');
    }
    const pepper = values['OTP_PEPPER'];
    if (
      pepper !== undefined &&
      (typeof pepper !== 'string' || Buffer.byteLength(pepper, 'utf8') < 32)
    ) {
      throw new Error(
        'Production OTP_PEPPER must contain at least 32 bytes when configured',
      );
    }
  }
  return values;
}
