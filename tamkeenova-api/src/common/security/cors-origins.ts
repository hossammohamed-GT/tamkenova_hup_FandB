const PUBLIC_ORIGIN = 'https://tamkeenova-hub.vercel.app';
const LOCAL_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function allowedCorsOrigins(): string[] {
  const extra = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [
    ...new Set([
      PUBLIC_ORIGIN,
      ...(process.env.NODE_ENV === 'production' ? [] : LOCAL_ORIGINS),
      ...extra,
    ]),
  ];
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return origin === undefined || allowedCorsOrigins().includes(origin);
}
