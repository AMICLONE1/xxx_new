/**
 * Error Utilities
 * 
 * Centralized error handling utilities for type-safe error management.
 */

/**
 * Extract error message from unknown error type
 * Use this in catch blocks instead of `error: any`
 * 
 * @example
 * try {
 *   await someAsyncOperation();
 * } catch (error: unknown) {
 *   return { success: false, error: getErrorMessage(error) };
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

/**
 * Type guard to check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if error has a code property (e.g., Supabase errors)
 */
export function isErrorWithCode(error: unknown): error is { code: string; message: string } {
  return (
    isErrorWithMessage(error) &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Log error safely in development mode
 */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`❌ [${context}]:`, error);
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse<T>(error: unknown, fallbackMessage: string): {
  success: false;
  error: string;
  data?: T;
} {
  return {
    success: false,
    error: getErrorMessage(error) || fallbackMessage,
  };
}
