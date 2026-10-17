import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SavedTrainersService {
  private readonly key = 'tamkeenova-saved-trainers-v1';
  readonly ids = signal<string[]>(this.read());
  readonly sessionOnly = signal(false);
  private read(): string[] {
    try {
      const rows: unknown = JSON.parse(localStorage.getItem(this.key) || '[]');
      return Array.isArray(rows) ? rows.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
  toggle(id: string) {
    this.ids.update((rows) =>
      rows.includes(id) ? rows.filter((value) => value !== id) : [...rows, id],
    );
    try {
      localStorage.setItem(this.key, JSON.stringify(this.ids()));
    } catch {
      this.sessionOnly.set(true);
    }
  }
}
