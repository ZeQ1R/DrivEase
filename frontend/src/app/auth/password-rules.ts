export interface PasswordRule { label: string; ok: boolean; }

export function passwordRules(value: string): PasswordRule[] {
  return [
    { label: '8+ characters', ok: value.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(value) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(value) },
    { label: 'A number', ok: /[0-9]/.test(value) },
  ];
}

export const isStrongPassword = (value: string) => passwordRules(value).every(r => r.ok);