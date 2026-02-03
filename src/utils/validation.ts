// Form Validation Utility for Recruitment Manager

export interface IValidationError {
  field: string;
  message: string;
}

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
}

export function requireField(value: unknown, fieldName: string): IValidationError | null {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function maxLength(value: string | undefined, fieldName: string, max: number = 255): IValidationError | null {
  if (value && value.length > max) {
    return { field: fieldName, message: `${fieldName} must be ${max} characters or less` };
  }
  return null;
}

export function validEmail(value: string | undefined, fieldName: string): IValidationError | null {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid email address` };
  }
  return null;
}

export function validPhone(value: string | undefined, fieldName: string): IValidationError | null {
  if (value && !/^[\d\s\-+().]{7,20}$/.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid phone number` };
  }
  return null;
}

export function nonNegativeNumber(value: number | undefined, fieldName: string): IValidationError | null {
  if (value !== undefined && value !== null && value < 0) {
    return { field: fieldName, message: `${fieldName} cannot be negative` };
  }
  return null;
}

export function futureDate(value: string | Date | undefined, fieldName: string): IValidationError | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) {
    return { field: fieldName, message: `${fieldName} is not a valid date` };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return { field: fieldName, message: `${fieldName} must be today or later` };
  }
  return null;
}

export function dateAfter(
  endValue: string | Date | undefined,
  startValue: string | Date | undefined,
  endFieldName: string,
  startFieldName: string
): IValidationError | null {
  if (!endValue || !startValue) return null;
  const end = typeof endValue === 'string' ? new Date(endValue) : endValue;
  const start = typeof startValue === 'string' ? new Date(startValue) : startValue;
  if (isNaN(end.getTime()) || isNaN(start.getTime())) return null;
  if (end <= start) {
    return { field: endFieldName, message: `${endFieldName} must be after ${startFieldName}` };
  }
  return null;
}

export function numberInRange(value: number | undefined, fieldName: string, min: number, max: number): IValidationError | null {
  if (value !== undefined && value !== null && (value < min || value > max)) {
    return { field: fieldName, message: `${fieldName} must be between ${min} and ${max}` };
  }
  return null;
}

export function validate(...checks: (IValidationError | null)[]): IValidationResult {
  const errors = checks.filter((e): e is IValidationError => e !== null);
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatErrors(result: IValidationResult): string {
  if (result.isValid) return '';
  return result.errors.map(e => e.message).join('\n');
}
