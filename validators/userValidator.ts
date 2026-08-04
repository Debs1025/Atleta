import { RegisterUserDto, LoginUserDto, UserRole } from '../models/userModel';

const VALID_ROLES: string[] = ['Athlete', 'Coach', 'Official', 'System Admin'];

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Normalizes input role string to exact UserRole enum
 */
export function normalizeRole(roleInput: string): UserRole {
  const lower = (roleInput || '').trim().toLowerCase();
  if (lower === 'athlete') return 'Athlete';
  if (lower === 'coach') return 'Coach';
  if (lower === 'official') return 'Official';
  if (lower === 'system admin' || lower === 'admin' || lower === 'system_admin') return 'System Admin';
  return 'Athlete';
}

/**
 * Validates registration request body for Base Identity and Subtype Child Profiles.
 */
export function validateRegisterUser(data: Record<string, unknown>, hasFile: boolean = false): ValidationError[] {
  const errors: ValidationError[] = [];

  // first_name (Required, Max 255)
  const firstName = typeof data.first_name === 'string' ? data.first_name.trim() : '';
  if (!firstName) {
    errors.push({ field: 'first_name', message: 'First name is required.' });
  } else if (firstName.length > 255) {
    errors.push({ field: 'first_name', message: 'First name must not exceed 255 characters.' });
  }

  // last_name (Required, Max 255)
  const lastName = typeof data.last_name === 'string' ? data.last_name.trim() : '';
  if (!lastName) {
    errors.push({ field: 'last_name', message: 'Last name is required.' });
  } else if (lastName.length > 255) {
    errors.push({ field: 'last_name', message: 'Last name must not exceed 255 characters.' });
  }

  // email (Required, Unique, RFC 5322 compliant)
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (!email) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', message: 'Email must be a valid RFC 5322 compliant address.' });
  }

  // password (Required, Min 6)
  const password = typeof data.password === 'string' ? data.password : '';
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters.' });
  }

  // contact_number (Optional, 11 characters)
  const contactNumber = typeof data.contact_number === 'string' ? data.contact_number.trim() : '';
  if (contactNumber && contactNumber.length !== 11) {
    errors.push({ field: 'contact_number', message: 'Contact number must be exactly 11 characters.' });
  }

  // role (Required, Enum "Athlete" | "Coach" | "Official" | "System Admin")
  const rawRole = typeof data.role === 'string' ? data.role.trim() : '';
  if (!rawRole) {
    errors.push({ field: 'role', message: 'Role is required.' });
  } else {
    const isMatched = VALID_ROLES.some((r) => r.toLowerCase() === rawRole.toLowerCase());
    if (!isMatched) {
      errors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
    }
  }

  const role = normalizeRole(rawRole);

  // --- Subtype Child Profile Field Validations ---
  if (role === 'Athlete') {
    const birthdate = typeof data.birthdate === 'string' ? data.birthdate.trim() : '';
    if (!birthdate) {
      errors.push({ field: 'birthdate', message: 'Birthdate is required for Athlete profile.' });
    }

    const gender = typeof data.gender === 'string' ? data.gender.trim() : '';
    if (!gender) {
      errors.push({ field: 'gender', message: 'Gender is required for Athlete profile.' });
    }

    const province = typeof data.province === 'string' ? data.province.trim() : '';
    if (!province) {
      errors.push({ field: 'province', message: 'Province is required for Athlete profile.' });
    }

    const sportType = typeof data.sport_type === 'string' ? data.sport_type.trim() : '';
    if (!sportType) {
      errors.push({ field: 'sport_type', message: 'Sport type is required for Athlete profile.' });
    }
  } else if (role === 'Coach') {
    if (data.years_of_experience === undefined || data.years_of_experience === null || data.years_of_experience === '') {
      errors.push({ field: 'years_of_experience', message: 'Years of experience is required for Coach profile.' });
    } else {
      const years = Number(data.years_of_experience);
      if (isNaN(years) || years < 0 || years > 70) {
        errors.push({ field: 'years_of_experience', message: 'Years of experience must be a non-negative number.' });
      }
    }

    const institution = typeof data.current_institution === 'string' ? data.current_institution.trim() : '';
    if (!institution) {
      errors.push({ field: 'current_institution', message: 'Current institution is required for Coach profile.' });
    }
  } else if (role === 'Official') {
    const affiliation = typeof data.tournament_affiliation === 'string' ? data.tournament_affiliation.trim() : '';
    if (!affiliation) {
      errors.push({ field: 'tournament_affiliation', message: 'Tournament affiliation is required for Official profile.' });
    }
  } else if (role === 'System Admin') {
    const adminKey = typeof data.admin_security_key === 'string' ? data.admin_security_key.trim() : '';
    if (!adminKey) {
      errors.push({ field: 'admin_security_key', message: 'Admin security key is required for System Admin profile.' });
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
