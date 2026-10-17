import { describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesRepository } from './courses.repository';
function setup() {
  const repo = {
    getCourseBySlug: jest.fn<(...args: any[]) => Promise<any>>(),
    getCourseAccess: jest.fn<(...args: any[]) => Promise<any>>(),
    getLessonPlayback: jest.fn<(...args: any[]) => Promise<any>>(),
  };
  return {
    repo,
    service: new CoursesService(repo as unknown as CoursesRepository),
  };
}
describe('Course video access', () => {
  it('never returns a paid lesson URL on the public endpoint', async () => {
    const { repo, service } = setup();
    repo.getCourseBySlug.mockResolvedValue({
      is_free: false,
      preview_video_url: 'intro',
      lessons: [
        { is_preview: true, media_url: 'preview' },
        { is_preview: false, media_url: 'private' },
      ],
    });
    const result = await service.getCourseBySlug('course');
    expect(result.data.lessons[0].media_url).toBe('preview');
    expect(result.data.lessons[1].media_url).toBeNull();
    expect(result.data.preview_video_url).toBe('intro');
  });
  it('returns all lesson URLs for a free course', async () => {
    const { repo, service } = setup();
    repo.getCourseBySlug.mockResolvedValue({
      is_free: true,
      lessons: [{ is_preview: false, media_url: 'video' }],
    });
    expect(
      (await service.getCourseBySlug('free')).data.lessons[0].media_url,
    ).toBe('video');
  });
  it('requires enrollment, not just authentication', async () => {
    const { repo, service } = setup();
    repo.getLessonPlayback.mockResolvedValue({
      is_preview: false,
      media_url: 'private',
      courses: { is_free: false, enrollments: [] },
    });
    await expect(
      service.getLessonPlayback('course', 'lesson', 'user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('permits enrollment, free courses or a flagged preview', async () => {
    const { repo, service } = setup();
    for (const [is_free, is_preview, enrollments] of [
      [false, false, [{ id: 'e' }]],
      [false, true, []],
      [true, false, []],
    ]) {
      repo.getLessonPlayback.mockResolvedValue({
        id: 'lesson',
        media_url: 'video',
        is_preview,
        courses: { is_free, enrollments },
      });
      expect(
        (await service.getLessonPlayback('course', 'lesson', 'user')).data
          .media_url,
      ).toBe('video');
    }
  });
  it('rejects unavailable courses/lessons and missing video URLs', async () => {
    const { repo, service } = setup();
    repo.getCourseBySlug.mockResolvedValue(null);
    repo.getCourseAccess.mockResolvedValue(null);
    repo.getLessonPlayback.mockResolvedValue(null);
    await expect(service.getCourseBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.getCourseAccess('missing', 'user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getLessonPlayback('course', 'lesson', 'user'),
    ).rejects.toBeInstanceOf(NotFoundException);
    repo.getLessonPlayback.mockResolvedValue({
      media_url: null,
      is_preview: true,
      courses: { is_free: false, enrollments: [] },
    });
    await expect(
      service.getLessonPlayback('course', 'lesson', 'user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('reports enrollment-based entitlement', async () => {
    const { repo, service } = setup();
    repo.getCourseAccess.mockResolvedValue({ is_free: false, enrollments: [] });
    expect(
      (await service.getCourseAccess('course', 'user')).data.can_watch,
    ).toBe(false);
    repo.getCourseAccess.mockResolvedValue({
      is_free: false,
      enrollments: [{ id: 'e' }],
    });
    expect(
      (await service.getCourseAccess('course', 'user')).data.can_watch,
    ).toBe(true);
  });
});
