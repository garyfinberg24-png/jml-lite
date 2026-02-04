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

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT SANITIZATION - Protection against OData injection and XSS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitizes a string for use in OData filter expressions.
 * Escapes single quotes to prevent OData injection attacks.
 *
 * @example
 * // User input: O'Brien
 * // Sanitized: O''Brien (double single quotes for OData)
 * const filter = `LastName eq '${sanitizeForOData(userInput)}'`;
 */
export function sanitizeForOData(value: string | undefined | null): string {
  if (value === undefined || value === null) return '';
  // Escape single quotes by doubling them (OData standard)
  return String(value).replace(/'/g, "''");
}

/**
 * Sanitizes a numeric value for OData filters.
 * Returns the number if valid, or 0 if invalid/missing.
 * Prevents injection via numeric fields.
 */
export function sanitizeNumberForOData(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? 0 : num;
}

/**
 * Sanitizes input for display (basic XSS protection).
 * Escapes HTML special characters to prevent script injection.
 */
export function sanitizeForDisplay(value: string | undefined | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates and sanitizes an ID value.
 * IDs must be positive integers.
 */
export function sanitizeId(value: number | string | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num <= 0) return undefined;
  return num;
}

/**
 * Truncates a string to a maximum length (for SharePoint field limits).
 * Useful for preventing data truncation errors.
 */
export function truncateToLength(value: string | undefined | null, maxLength: number): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Builds a safe OData filter string with proper escaping.
 *
 * @example
 * buildODataFilter('Department', 'eq', "O'Brien's Team")
 * // Returns: "Department eq 'O''Brien''s Team'"
 */
export function buildODataFilter(
  field: string,
  operator: 'eq' | 'ne' | 'contains' | 'startswith' | 'endswith',
  value: string | number | boolean | undefined | null
): string {
  if (value === undefined || value === null) return '';

  // Validate field name (alphanumeric and underscore only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
    console.warn(`[Sanitization] Invalid field name rejected: ${field}`);
    return '';
  }

  if (typeof value === 'boolean') {
    return `${field} ${operator} ${value}`;
  }

  if (typeof value === 'number') {
    const sanitizedNum = sanitizeNumberForOData(value);
    return `${field} ${operator} ${sanitizedNum}`;
  }

  const sanitizedValue = sanitizeForOData(value);

  if (operator === 'contains') {
    return `substringof('${sanitizedValue}', ${field})`;
  }
  if (operator === 'startswith' || operator === 'endswith') {
    return `${operator}(${field}, '${sanitizedValue}')`;
  }

  return `${field} ${operator} '${sanitizedValue}'`;
}

/**
 * Combines multiple filter conditions with AND/OR.
 * Filters out empty conditions automatically.
 */
export function combineODataFilters(
  filters: string[],
  operator: 'and' | 'or' = 'and'
): string {
  const validFilters = filters.filter(f => f && f.trim().length > 0);
  if (validFilters.length === 0) return '';
  if (validFilters.length === 1) return validFilters[0];
  return validFilters.join(` ${operator} `);
}
