/**
 * Password Validation Utilities
 * Enforces strong password requirements for security
 */

export interface PasswordValidation {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

// Password requirements
const MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*]/;

/**
 * Validate password against all requirements
 * SECURITY: Never log the actual password
 */
export function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= MIN_LENGTH;
  const hasUppercase = UPPERCASE_REGEX.test(password);
  const hasLowercase = LOWERCASE_REGEX.test(password);
  const hasNumber = NUMBER_REGEX.test(password);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);

  const isValid =
    hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
}

/**
 * Check if passwords match
 * SECURITY: Never log passwords
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}

/**
 * Get password strength level for UI display
 */
export function getPasswordStrength(validation: PasswordValidation): 'weak' | 'medium' | 'strong' {
  const passedCount = [
    validation.hasMinLength,
    validation.hasUppercase,
    validation.hasLowercase,
    validation.hasNumber,
    validation.hasSpecialChar,
  ].filter(Boolean).length;

  if (passedCount <= 2) return 'weak';
  if (passedCount <= 4) return 'medium';
  return 'strong';
}
