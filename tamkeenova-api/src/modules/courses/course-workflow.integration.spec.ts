import { it, expect } from '@jest/globals';
import { VerificationService } from '../verification/verification.service';
import { VerificationRepository } from '../verification/verification.repository';
it('issued course certificates and teacher-approved course completions integrate with the existing public verification profile', async () => {
  const course = {
    title_ar: 'القيادة',
    title_en: 'Leadership',
    duration_minutes: 90,
    level: 'BEGINNER',
    owner: { slug: 'teacher', users: { full_name: 'Teacher' } },
  };
  const service = new VerificationService({
    getUserForVerification: async () => ({
      full_name: 'Learner',
      total_training_hours: 1,
      certificates: [
        {
          id: 'cert',
          is_valid: true,
          training_hours: 2,
          course: course,
          trainers: null,
          training_programs: null,
        },
      ],
      student_enrollments: [],
      course_enrollments: [
        { id: 'enrollment', completed_at: new Date(), courses: course },
      ],
      student_skills: [],
    }),
  } as unknown as VerificationRepository);
  const result = await service.verifyUser('learner');
  expect(result.stats).toMatchObject({
    total_certificates: 1,
    total_completed_programs: 1,
    total_training_hours: 2,
  });
  expect(result.completed_programs[0]).toMatchObject({
    program: { title: 'القيادة', duration_hours: 2 },
    trainer: { name: 'Teacher' },
  });
  expect(result.certificates[0].program?.title).toBe('القيادة');
});
