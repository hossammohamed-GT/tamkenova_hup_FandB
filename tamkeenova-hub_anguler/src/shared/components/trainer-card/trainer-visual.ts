const palettes = [
  { color: '#006575', light: '#79dce3', icon: 'M8 5 2 12l6 7m8-14 6 7-6 7m-3-16-3 18' },
  { color: '#a66a1d', light: '#ffda9a', icon: 'M4 21v-7h4v7m4 0V9h4v12m4 0V3M3 9l6-5 5 2 7-5' },
  {
    color: '#6346aa',
    light: '#c7b4ff',
    icon: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Zm0 4v12M6 8l6-2 6 2',
  },
  {
    color: '#b55068',
    light: '#ffbaca',
    icon: 'M12 3a9 9 0 1 0 0 18h1c4 0-1-6 3-6h2c7 0 4-12-6-12ZM7 9h.01M11 6h.01M16 7h.01M6 14h.01',
  },
  { color: '#2877a3', light: '#a1d9fa', icon: 'M8 7V4h8v3M3 8h18v12H3zM3 12l9 3 9-3' },
  { color: '#287b57', light: '#9cdec4', icon: 'M4 21C0 7 10 3 21 2c0 12-5 20-17 19ZM4 21 17 7' },
  { color: '#275c8d', light: '#9fcff1', icon: 'M3 4h18v13H3zM8 21h8m-4-4v4' },
  {
    color: '#7853b2',
    light: '#dcc7ff',
    icon: 'M2 8l10-5 10 5-10 5zM6 10v7c4 3 8 3 12 0v-7M22 8v9',
  },
];
export function trainerVisual(specialization: string, fallback = 0) {
  const label = specialization.toLowerCase();
  const matches = [
    /web|develop|technology|programming|cloud|تطوير|برمجة|تكنولوجيا/,
    /data|science|analyt|بيانات|تحليل/,
    /cyber|security|أمن|سيبراني/,
    /design|arts|ui\/ux|تصميم|فنون/,
    /business|entrepreneur|أعمال|إدارة/,
    /health|wellbeing|صحة|عافية/,
    /automation|ai |ذكاء/,
    /education|academic|تعليم|أكاديم/,
  ];
  const matched = matches.findIndex((pattern) => pattern.test(label));
  const index =
    matched >= 0
      ? matched
      : specialization
        ? Array.from(specialization).reduce((value, c) => value + c.charCodeAt(0), 0)
        : fallback;
  return palettes[Math.abs(index) % palettes.length];
}
export function safePublicLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
