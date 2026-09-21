export interface PasswordRequirement {
  key: string;
  labelKey: string;
  test: (value: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: 'length', labelKey: 'auth.password_rules.length', test: (v) => v.length >= 8 },
  { key: 'upper', labelKey: 'auth.password_rules.upper', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', labelKey: 'auth.password_rules.lower', test: (v) => /[a-z]/.test(v) },
  { key: 'number', labelKey: 'auth.password_rules.number', test: (v) => /[0-9]/.test(v) },
];

export function passwordScore(value: string): number {
  if (!value) return 0;
  return PASSWORD_REQUIREMENTS.filter((r) => r.test(value)).length;
}
