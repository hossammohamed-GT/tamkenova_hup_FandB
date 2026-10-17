import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TrainersService } from './trainers.service';
import { TrainersRepository } from './trainers.repository';
import { publicCourseWhere } from '../courses/public-course-policy';

describe('Trainer one-time card review contract', () => {
  let repository: any, service: TrainersService;
  beforeEach(() => {
    repository = {
      findUserById: jest.fn<any>().mockResolvedValue({ role: 'STUDENT' }),
      findTrainerById: jest
        .fn<any>()
        .mockResolvedValue({ trainer_status: 'APPROVED', user_id: 'author' }),
      findReviewByTrainerAndStudent: jest.fn<any>().mockResolvedValue(null),
      createReview: jest
        .fn<any>()
        .mockResolvedValue({ id: 'review', rating: 5 }),
      updateReview: jest.fn(),
      updateTrainerRating: jest
        .fn<any>()
        .mockResolvedValue({ average_rating: 4.8, ratings_count: 12 }),
      getReviewStatusForStudent: jest
        .fn<any>()
        .mockResolvedValue([{ trainer_id: 'trainer', rating: 4 }]),
    };
    service = new TrainersService(repository, {} as any, {} as any);
  });
  it('creates one rating and returns authoritative aggregate data', async () => {
    const result = await service.createReview('learner', 'trainer', {
      rating: 5,
      comment: '',
    });
    expect(result.updated).toBe(false);
    expect(result.data.ratings_count).toBe(12);
    expect(repository.createReview).toHaveBeenCalledWith({
      student_id: 'learner',
      trainer_id: 'trainer',
      rating: 5,
      comment: '',
    });
  });
  it('rejects an existing rating without changing it or its written comment', async () => {
    repository.findReviewByTrainerAndStudent.mockResolvedValue({
      id: 'original',
      rating: 3,
      comment: 'Original review',
    });
    await expect(
      service.createReview('learner', 'trainer', { rating: 5, comment: '' }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.createReview).not.toHaveBeenCalled();
    expect(repository.updateReview).not.toHaveBeenCalled();
    expect(repository.updateTrainerRating).not.toHaveBeenCalled();
  });
  it('rejects a duplicate database race instead of turning it into an update', async () => {
    repository.createReview.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.createReview('learner', 'trainer', { rating: 5 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.updateReview).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'TRAINER', 'EMPLOYEE'])(
    'does not allow %s to rate',
    async (role) => {
      repository.findUserById.mockResolvedValue({ role });
      await expect(
        service.createReview('learner', 'trainer', { rating: 5 }),
      ).rejects.toMatchObject({ status: 403 });
    },
  );
  it('rejects unapproved trainers and self-rating', async () => {
    repository.findTrainerById.mockResolvedValue({ trainer_status: 'PENDING' });
    await expect(
      service.createReview('learner', 'trainer', { rating: 5 }),
    ).rejects.toMatchObject({ status: 400 });
    repository.findTrainerById.mockResolvedValue({
      trainer_status: 'APPROVED',
      user_id: 'learner',
    });
    await expect(
      service.createReview('learner', 'trainer', { rating: 5 }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('uses the authenticated learner for the batched previous-rating lookup', async () => {
    expect(await service.getMyReviewStatus('learner')).toEqual({
      success: true,
      data: [{ trainer_id: 'trainer', rating: 4 }],
    });
    expect(repository.getReviewStatusForStudent).toHaveBeenCalledWith(
      'learner',
    );
  });
  it('does not misreport a database outage as already rated', async () => {
    repository.createReview.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(
      service.createReview('learner', 'trainer', { rating: 5 }),
    ).rejects.toThrow('database unavailable');
  });
});

describe('Trainer public-profile and private status data selection', () => {
  it('private lookup only returns trainer IDs and ratings for the requesting student', async () => {
    const findMany = jest.fn<any>().mockResolvedValue([]);
    const repo = new TrainersRepository({
      trainer_reviews: { findMany },
    } as any);
    await repo.getReviewStatusForStudent('current-student');
    expect(findMany).toHaveBeenCalledWith({
      where: { student_id: 'current-student' },
      select: { trainer_id: true, rating: true },
    });
  });
  it('profile courses must be published, non-demo, and omit lesson media/private fields', async () => {
    const findFirst = jest.fn<any>().mockResolvedValue(null);
    const repo = new TrainersRepository({ trainers: { findFirst } } as any);
    await repo.getPublicTrainerProfile('real-instructor');
    const query: any = findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      slug: 'real-instructor',
      trainer_status: 'APPROVED',
    });
    expect(query.include.course_instructors.where.courses.is).toEqual(
      publicCourseWhere,
    );
    const fields = query.include.course_instructors.select.courses.select;
    expect(fields.slug).toBe(true);
    expect(fields.media_url).toBeUndefined();
    expect(fields.lessons).toBeUndefined();
    expect(fields.owner_trainer_id).toBeUndefined();
  });
});
