/**
 * API error → stable i18n key (frontend "level 1" mapping from the
 * backend error-handling reference). The backend `message` text is for
 * debugging only — never shown to users.
 */

type ErrRule = {
  key: string;
  status?: number[];
  path?: RegExp;
  msg?: RegExp;
  arrayMsg?: boolean;
};

const RULES: ErrRule[] = [
  // -- Generic guards --
  { key: 'AUTH_NO_TOKEN', msg: /Authorization header missing/i },
  { key: 'AUTH_BAD_TOKEN', msg: /Invalid token format/i },
  { key: 'AUTH_SESSION_EXPIRED', msg: /Invalid or expired token/i },
  { key: 'AUTH_FORBIDDEN', msg: /^Access denied$/i },
  { key: 'AUTH_ROLE_FORBIDDEN', msg: /do not have permission/i },

  // -- Auth --
  { key: 'AUTH_EMAIL_EXISTS', msg: /Email already exists/i },
  { key: 'AUTH_USERNAME_EXISTS', msg: /Username already exists/i },
  { key: 'AUTH_PHONE_EXISTS', msg: /Phone number already exists/i },
  { key: 'AUTH_SPECIALIZATION_NOT_FOUND', msg: /Specialization not found/i, path: /\/auth\// },
  { key: 'AUTH_INVALID_OTP', msg: /Invalid OTP/i },
  { key: 'AUTH_OTP_EXPIRED', msg: /OTP expired/i },
  { key: 'AUTH_USER_NOT_FOUND', msg: /User not found/i, path: /\/auth\// },
  { key: 'AUTH_EMAIL_VERIFIED', msg: /Email already verified/i },
  { key: 'AUTH_INVALID_CREDENTIALS', msg: /Invalid email or password/i },
  { key: 'AUTH_EMAIL_NOT_VERIFIED', msg: /Email not verified/i },
  { key: 'AUTH_ACCOUNT_DISABLED', msg: /Account disabled/i },

  // -- Student profile --
  { key: 'STUDENT_USERNAME_TAKEN', msg: /Username is already taken/i },
  { key: 'WRONG_PASSWORD', msg: /Current password is incorrect/i },
  { key: 'SAME_PASSWORD', msg: /must be different from current password/i },
  { key: 'EMAIL_IN_USE', msg: /Email is already in use/i },
  { key: 'PHONE_IN_USE', msg: /Phone number is already in use/i },
  { key: 'BAD_FILE_TYPE', msg: /Only JPG, PNG, and WEBP/i },
  { key: 'FILE_TOO_LARGE', msg: /size must not exceed/i },
  { key: 'NO_FILE', msg: /No file provided/i },

  // -- Programs & enrollments --
  { key: 'PROGRAM_NOT_FOUND', msg: /Program not found/i },
  { key: 'PROGRAM_INACTIVE', msg: /program is not currently available/i },
  { key: 'ENROLL_ALREADY', msg: /already enrolled/i },
  { key: 'ENROLL_NOT_FOUND', msg: /Enrollment not found/i },
  { key: 'ENROLL_BAD_STATUS', msg: /Cannot cancel enrollment/i },

  // -- Certificates / reviews / public profile --
  { key: 'CERT_NOT_FOUND', msg: /Certificate not found/i },
  { key: 'REVIEW_NOT_FOUND', msg: /Review not found/i },
  { key: 'REVIEW_EMPTY', msg: /At least one field \(rating or comment\)/i },
  { key: 'PROFILE_USER_NOT_FOUND', msg: /User not found or not verified/i },

  // -- Trainer --
  { key: 'TRAINER_NOT_FOUND', msg: /Trainer not found/i },
  { key: 'TRAINER_UNAUTHORIZED', msg: /^Unauthorized$/i, path: /\/trainers\// },

  // -- Consultations --
  { key: 'CONSULT_NOT_FOUND', msg: /Consultation not found/i },
  { key: 'CONSULT_NOT_YOURS', msg: /does not belong to you/i },
  { key: 'CONSULT_NO_ACCESS', msg: /do not have access to this consultation/i },
  { key: 'CONSULT_BAD_STATUS', msg: /Cannot cancel consultation/i },
  { key: 'CONSULT_REVIEW_NOT_COMPLETED', msg: /only review completed consultations/i },
  { key: 'CONSULT_ALREADY_REVIEWED', msg: /already reviewed this consultation/i },

  // -- Corporate --
  { key: 'CORPORATE_NOT_FOUND', msg: /Corporate request not found/i },
  { key: 'CORPORATE_NOT_YOURS', msg: /request does not belong to you/i },
  { key: 'BAD_FILE_TYPE', msg: /Only PDF, DOC, DOCX, JPG, PNG, WEBP/i },
  { key: 'CORPORATE_NEED_ASSIGNEE', msg: /assigned_to \(employee id\) is required/i },

  // -- Admin --
  { key: 'VOLUNTEER_NOT_FOUND', msg: /Volunteer not found/i },
  { key: 'ADMIN_CERT_BAD_TYPE', msg: /Only PDF files are allowed/i },
  { key: 'SPEC_EXISTS', msg: /Specialization already exists/i },
  { key: 'SPEC_NOT_FOUND', msg: /Specialization not found/i },

  // -- Tasks --
  { key: 'TASK_NO_ASSIGNEES', msg: /At least one assignee is required/i },
  { key: 'TASK_USER_NOT_FOUND', msg: /Assignee user not found/i },
  { key: 'TASK_BAD_ROLE', msg: /is not an employee or volunteer/i },
  { key: 'TASK_NOT_FOUND', msg: /Task not found/i },
  { key: 'TASK_ALREADY_ASSIGNED', msg: /already assigned to this task/i },
  { key: 'TASK_ASSIGNMENT_NOT_FOUND', msg: /Assignment not found/i },
  { key: 'TASK_NO_SUBMISSION', msg: /no submission to review/i },
  { key: 'TASK_LOCKED', msg: /must complete the previous task/i },
  { key: 'TASK_ALREADY_STARTED', msg: /already been started/i },
  { key: 'TASK_ALREADY_APPROVED', msg: /Task already approved/i },
  { key: 'TASK_EMPTY_SUBMISSION', msg: /must provide content, a link/i },
  { key: 'TASK_SUBMISSION_FAILED', msg: /Failed to save task submission/i },
  { key: 'TASK_NOT_ASSIGNED', msg: /not assigned to this task/i },
  { key: 'NOTIFICATION_NOT_FOUND', msg: /Notification not found/i },
];

/**
 * Maps an HttpErrorResponse to an `errors.*` translation key.
 * Falls back to `fallback` only when the error carries no recognizable
 * HTTP shape at all — otherwise status-based fallbacks apply.
 */
export function apiErrorKey(err: unknown, fallback?: string): string {
  const e = err as { status?: number; statusText?: string; url?: string; error?: { message?: string | string[] } } | null;

  // Network failure / request never reached the server
  if (e && typeof e === 'object' && 'status' in e && (e.status === 0 || e.status === -1) && !e.statusText) {
    return 'errors.S_OFFLINE';
  }

  const status = typeof e?.status === 'number' ? e.status : 0;
  const raw = e?.error?.message;
  const path = e?.url ?? '';
  const messages = Array.isArray(raw) ? raw : raw != null ? [String(raw)] : [];

  for (const rule of RULES) {
    if (rule.status && !rule.status.includes(status)) continue;
    if (rule.path && !rule.path.test(path)) continue;
    if (rule.msg && messages.some((m) => rule.msg!.test(m))) return `errors.${rule.key}`;
  }

  // Validation pipe: message is an array of class-validator strings
  if (Array.isArray(raw) && raw.length > 0) return 'errors.VALIDATION';

  // Status-level fallbacks
  if (status === 401) return 'errors.AUTH_SESSION_EXPIRED';
  if (status === 403) return 'errors.S_403';
  if (status === 404) return 'errors.S_404';
  if (status === 409) return 'errors.S_409';
  if (status === 400) return messages.length > 0 ? 'errors.VALIDATION' : 'errors.S_400';
  if (status >= 500) return 'errors.S_500';

  return fallback ?? 'errors.S_400';
}
