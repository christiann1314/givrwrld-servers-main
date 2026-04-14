export interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`At least ${MIN_LENGTH} characters`);
  }
  if (password.length > MAX_LENGTH) {
    errors.push(`No more than ${MAX_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('At least one special character');
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (errors.length === 0) {
    const hasExtra = password.length >= 12 && /[^a-zA-Z0-9]/.test(password);
    strength = password.length >= 14 && hasExtra ? 'strong' : password.length >= 10 ? 'medium' : 'weak';
  }

  return {
    isValid: errors.length === 0,
    strength,
    errors,
  };
}
