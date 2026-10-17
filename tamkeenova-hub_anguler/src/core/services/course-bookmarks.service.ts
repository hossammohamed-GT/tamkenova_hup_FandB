import { Injectable, signal } from '@angular/core';

const KEY = 'tamkeenova-course-bookmarks-v1';

/** Device-local reading list, not an enrollment or a server-synced wishlist. */
@Injectable({ providedIn: 'root' })
export class CourseBookmarksService {
  private readonly state = signal<ReadonlySet<string>>(this.read());
  readonly saved = this.state.asReadonly();

  has(id: string): boolean {
    return this.state().has(id);
  }

  toggle(id: string): { saved: boolean; persisted: boolean } {
    const next = new Set(this.state());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    let persisted = false;
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
      persisted = true;
    } catch {
      /* Storage disabled/full: retain a clearly announced session-only list. */
    }
    this.state.set(next);
    return { saved: next.has(id), persisted };
  }

  private read(): ReadonlySet<string> {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return new Set(
        Array.isArray(value)
          ? value
              .filter(
                (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200,
              )
              .slice(0, 1000)
          : [],
      );
    } catch {
      return new Set();
    }
  }
}
