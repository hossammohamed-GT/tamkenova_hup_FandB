import { TestBed } from '@angular/core/testing';
import { CourseBookmarksService } from './course-bookmarks.service';
const key = 'tamkeenova-course-bookmarks-v1';
describe('Device-local course bookmarks', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  it('saves and removes an ID without claiming enrollment or server synchronization', () => {
    const service = TestBed.inject(CourseBookmarksService);
    expect(service.toggle('course')).toEqual({ saved: true, persisted: true });
    expect(service.has('course')).toBe(true);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(['course']);
    expect(service.toggle('course')).toEqual({ saved: false, persisted: true });
    expect(service.has('course')).toBe(false);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual([]);
  });
  it.each(['not-json', '{}', 'null', '[null,0,{},"", "valid", "valid"]'])(
    'handles corrupted saved data: %s',
    (value) => {
      localStorage.setItem(key, value);
      const service = TestBed.inject(CourseBookmarksService);
      expect([...service.saved()]).toEqual(value.includes('valid') ? ['valid'] : []);
    },
  );
  it('restores previously saved IDs', () => {
    localStorage.setItem(key, JSON.stringify(['course-1', 'course-2']));
    const service = TestBed.inject(CourseBookmarksService);
    expect(service.has('course-2')).toBe(true);
  });
  it('announces a session-only save when device storage is blocked', () => {
    const service = TestBed.inject(CourseBookmarksService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(service.toggle('course')).toEqual({ saved: true, persisted: false });
    expect(service.has('course')).toBe(true);
  });
  it('can start with storage entirely disabled', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(TestBed.inject(CourseBookmarksService).saved().size).toBe(0);
  });
});
