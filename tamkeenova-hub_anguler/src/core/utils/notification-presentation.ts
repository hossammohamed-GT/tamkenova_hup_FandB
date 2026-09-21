// -- Shared presentation helpers for AppNotifications --
// Maps a notification `type` (free-form string from the API) to an icon,
// a color tone and a translated fallback title/message.

export type NotificationTone = 'primary' | 'accent' | 'success' | 'danger' | 'info' | 'neutral';

export function notificationIcon(type: string | null | undefined): string {
  const t = (type ?? '').toUpperCase();
  if (t.includes('TRAINER')) return 'fa-chalkboard-user';
  if (t.includes('VOLUNTEER')) return 'fa-people-group';
  if (t.includes('TASK')) return 'fa-list-check';
  if (t.includes('CERTIFICATE')) return 'fa-certificate';
  if (t.includes('CONSULT')) return 'fa-comments';
  if (t.includes('CORPORATE') || t.includes('B2B')) return 'fa-building';
  if (t.includes('ENROLL') || t.includes('PROGRAM')) return 'fa-book';
  if (t.includes('REVIEW') || t.includes('RATING')) return 'fa-star';
  if (t.includes('USER') || t.includes('REGISTER') || t.includes('ACCOUNT') || t.includes('SIGNUP')) return 'fa-user-plus';
  if (t.includes('MESSAGE') || t.includes('CHAT')) return 'fa-envelope';
  if (t.includes('PAYMENT') || t.includes('WALLET')) return 'fa-wallet';
  return 'fa-bell';
}

export function notificationTone(type: string | null | undefined): NotificationTone {
  const t = (type ?? '').toUpperCase();
  if (t.includes('REJECT') || t.includes('CANCEL') || t.includes('SUSPEND') || t.includes('EXPIRE')) return 'danger';
  if (t.includes('APPROVE') || t.includes('ACCEPT') || t.includes('COMPLETE')) return 'success';
  if (t.includes('CERTIFICATE') || t.includes('VOLUNTEER')) return 'success';
  if (t.includes('TRAINER')) return 'accent';
  if (t.includes('CORPORATE') || t.includes('B2B')) return 'accent';
  if (t.includes('TASK')) return 'info';
  if (t.includes('CONSULT')) return 'primary';
  if (t.includes('ENROLL') || t.includes('PROGRAM')) return 'primary';
  if (t.includes('USER') || t.includes('REGISTER') || t.includes('ACCOUNT')) return 'info';
  return 'neutral';
}

// Translation key describing what the notification is about (used as a
// fallback when the backend title/message are empty).
export function notificationTypeKey(type: string | null | undefined): string {
  const t = (type ?? '').toUpperCase();
  if (t.includes('TRAINER') && (t.includes('NEW') || t.includes('REGISTER') || t.includes('PENDING') || t.includes('REQUEST'))) {
    return 'new_trainer';
  }
  if (t.includes('TRAINER') && t.includes('APPROVE')) return 'trainer_approved';
  if (t.includes('TRAINER') && t.includes('REJECT')) return 'trainer_rejected';
  if (t.includes('VOLUNTEER') && (t.includes('NEW') || t.includes('REGISTER') || t.includes('PENDING'))) return 'new_volunteer';
  if (t.includes('VOLUNTEER')) return 'volunteer_update';
  if (t.includes('TASK') && (t.includes('NEW') || t.includes('ASSIGN'))) return 'new_task';
  if (t.includes('TASK')) return 'task_update';
  if (t.includes('CORPORATE')) return 'corporate_update';
  if (t.includes('CONSULT')) return 'consultation_update';
  if (t.includes('CERTIFICATE')) return 'certificate';
  if (t.includes('USER') || t.includes('REGISTER') || t.includes('ACCOUNT')) return 'account';
  return 'update';
}

// Types we can confidently translate in the UI. The backend currently sends
// English-only titles/messages, so for these types the UI overrides the
// backend text with the user's language.
export function isKnownNotificationType(type: string | null | undefined): boolean {
  return notificationTypeKey(type) !== 'update';
}
