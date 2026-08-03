import { RegisterUserDto, LoginUserDto, UserRole } from '../models/userModel';

const VALID_ROLES: string[] = ['Athlete', 'Coach', 'Official', 'System Admin', 'athlete', 'coach'];

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates the registration request body.
 * Supports both JSON and multipart form data.
 */
export function validateRegisterUser(data: Record<string, unknown>, hasFile: boolean = false): ValidationError[] {
  const errors: ValidationError[] = [];

  // first_name
  const firstName = typeof data.first_name === 'string' ? data.first_name.trim() : '';
  if (!firstName) {
    errors.push({ field: 'first_name', message: 'First name is required.' });
  } else if (firstName.length > 255) {
    errors.push({ field: 'first_name', message: 'First name must not exceed 255 characters.' });
  }

  // last_name
  const lastName = typeof data.last_name === 'string' ? data.last_name.trim() : '';
  if (!lastName) {
    errors.push({ field: 'last_name', message: 'Last name is required.' });
  } else if (lastName.length > 255) {
    errors.push({ field: 'last_name', message: 'Last name must not exceed 255 characters.' });
  }

  // email
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', message: 'Email must be a valid RFC 5322 compliant address.' });
  }

  // password
  const password = typeof data.password === 'string' ? data.password : '';
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters.' });
  }

  // contact_number (optional, but if provided must be 11 chars)
  const contactNumber = typeof data.contact_number === 'string' ? data.contact_number.trim() : '';
  if (contactNumber && contactNumber.length !== 11) {
    errors.push({ field: 'contact_number', message: 'Contact number must be exactly 11 characters.' });
  }

  // role
  const role = typeof data.role === 'string' ? data.role : '';
  if (!role) {
    errors.push({ field: 'role', message: 'Role is required.' });
  } else if (!VALID_ROLES.includes(role)) {
    errors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
  }

  // Role specific optional/additional field validations
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === 'athlete') {
    if (data.birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.birthdate).trim())) {
      errors.push({ field: 'birthdate', message: 'Birthdate must use YYYY-MM-DD format.' });
    }
  } else if (normalizedRole === 'coach') {
    if (data.years_of_experience !== undefined && data.years_of_experience !== null && data.years_of_experience !== '') {
      const years = Number(data.years_of_experience);
      if (isNaN(years) || years < 0 || years > 60) {
        errors.push({ field: 'years_of_experience', message: 'Years of experience must be between 0 and 60.' });
      }
    }
  }

  return errors;
}

/**
 * Validates the login request body.
 */
export function validateLoginUser(data: Partial<LoginUserDto>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.email || data.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required.' });
  }

  if (!data.password || data.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  return errors;
}

/**
 * Validates the password reset request body.
 */
export function validatePasswordResetRequest(data: { email?: string }): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.email || data.email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.push({ field: 'email', message: 'Email must be a valid RFC 5322 compliant address.' });
  }

  return errors;
}

/**
 * Validates the password reset confirmation body.
 */
export function validatePasswordResetConfirm(data: { token?: string; new_password?: string }): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.token || data.token.trim().length === 0) {
    errors.push({ field: 'token', message: 'Reset token is required.' });
  }

  if (!data.new_password || data.new_password.length === 0) {
    errors.push({ field: 'new_password', message: 'New password is required.' });
  } else if (data.new_password.length < 6) {
    errors.push({ field: 'new_password', message: 'New password must be at least 6 characters.' });
  }

  return errors;
}

/**
 * Validates change password request body.
 */
export function validateChangePassword(data: { password?: string }): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.password || data.password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (data.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters.' });
  }

  return errors;
}
