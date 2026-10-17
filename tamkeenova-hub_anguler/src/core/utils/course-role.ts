
export function courseManagementRoute(role?: string | null): string | null {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/portal/admin/course-workflow';
  if (role === 'TRAINER') return '/portal/trainer/courses';
  return null;
}
