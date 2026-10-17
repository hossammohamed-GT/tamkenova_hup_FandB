import { AppNotification } from '../models/student.model';
/** Only local, known routes; never navigate to an arbitrary server-provided URL. */
export function courseWorkflowNotificationTarget(notification: AppNotification) {
  const type = (notification.reference_type || '').toUpperCase();
  if (type === 'COURSE_REVIEW')
    return { commands: ['/portal/admin/course-workflow'], queryParams: { tab: 'courses' } };
  if (type === 'COURSE_PAYMENT')
    return { commands: ['/portal/admin/course-workflow'], queryParams: { tab: 'payments' } };
  if (type === 'COURSE_AUTHOR' || type === 'COURSE_COMPLETION')
    return { commands: ['/portal/trainer/courses'], queryParams: {} };
  if (type === 'COURSE_LEARNING' || type === 'COURSE_CERTIFICATE')
    return { commands: ['/my-courses'], queryParams: {} };
  return null;
}
