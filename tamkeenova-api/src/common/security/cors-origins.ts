const DEFAULT_ORIGINS = [
  'https://tamkeenova-hub.vercel.app',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function allowedCorsOrigins(): string[] {
  const extra = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ORIGINS, ...extra])];
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return allowedCorsOrigins().includes(origin.replace(/\/$/, ''));
}
