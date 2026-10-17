const SENSITIVE_KEY =
  /password|secret|token|authorization|cookie|otp|api.?key|database.?url/i;

export function redactLog(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (typeof value === 'string') {
    let safe = value
      .replace(/\bBearer\s+[a-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
      .replace(
        /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/gi,
        '[REDACTED_DATABASE_URL]',
      )
      .replace(
        /([?&](?:token|access_token|otp|password|code|email|phone)=)[^&\s]*/gi,
        '$1[REDACTED]',
      );
    for (const key of [
      'JWT_SECRET',
      'OTP_PEPPER',
      'SUPABASE_SECRET_KEY',
      'MAIL_PASSWORD',
    ]) {
      const secret = process.env[key];
      if (secret && secret.length >= 6)
        safe = safe.split(secret).join('[REDACTED]');
    }
    return safe.slice(0, 8192);
  }
  if (!value || typeof value !== 'object') return value;
  if (depth >= 8 || seen.has(value)) return '[TRUNCATED]';
  seen.add(value);
  if (value instanceof Error)
    return {
      name: value.name,
      message: redactLog(value.message),
      stack: redactLog(value.stack),
    };
  if (value instanceof Date) return value;
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => redactLog(item, seen, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : redactLog(child, seen, depth + 1),
    ]),
  );
}
