import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { TrainerRatingsService } from './trainer-ratings.service';

describe('Server-backed trainer rating state', () => {
  const user = signal<{ id: string; role: string } | null>({ id: 'learner-a', role: 'STUDENT' });
  let service: TrainerRatingsService, http: HttpTestingController;
  beforeEach(() => {
    user.set({ id: 'learner-a', role: 'STUDENT' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: user,
            isLoggedIn: computed(() => !!user()),
            isStudent: computed(() => user()?.role === 'STUDENT'),
          },
        },
      ],
    });
    service = TestBed.inject(TrainerRatingsService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => http.verify());
  function status(data: unknown = []) {
    http.expectOne((req) => req.url.endsWith('/trainers/reviews/mine')).flush({ data });
  }
  it('loads previous ratings once for all trainer cards, using private server state', () => {
    expect(service.state()).toBe('loading');
    status([{ trainer_id: 'trainer', rating: 4 }]);
    expect(service.previous('trainer')?.rating).toBe(4);
    expect(service.state()).toBe('ready');
    expect(TestBed.inject(TrainerRatingsService)).toBe(service);
    TestBed.tick();
    http.expectNone((req) => req.url.endsWith('/reviews/mine'));
  });
  it('updates shared aggregate and read-only status only after a successful submission', () => {
    status();
    service.submit('trainer', 5).subscribe();
    expect(service.previous('trainer')).toBeUndefined();
    const req = http.expectOne((req) => req.method === 'POST');
    expect(req.request.body).toEqual({ rating: 5, comment: '' });
    req.flush({ data: { review: { rating: 5 }, average_rating: '4.75', ratings_count: 4 } });
    expect(service.previous('trainer')?.rating).toBe(5);
    expect(service.aggregates()['trainer']).toEqual({ average_rating: 4.75, ratings_count: 4 });
  });
  it('treats a 409 as already rated, without fabricating aggregate statistics', () => {
    status();
    service.submit('trainer', 5).subscribe({ error: () => {} });
    http
      .expectOne((req) => req.method === 'POST')
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(service.previous('trainer')).toBeTruthy();
    expect(service.aggregates()['trainer']).toBeUndefined();
  });
  it('does not mark a failed submission as saved', () => {
    status();
    service.submit('trainer', 5).subscribe({ error: () => {} });
    http
      .expectOne((req) => req.method === 'POST')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.previous('trainer')).toBeUndefined();
  });
  it('distinguishes failed status lookup from no previous rating and can retry', () => {
    http
      .expectOne((req) => req.url.endsWith('/reviews/mine'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.state()).toBe('error');
    service.retry();
    TestBed.tick();
    status([]);
    expect(service.state()).toBe('ready');
  });
  it('clears state on account switch and cancels the previous lookup', () => {
    const old = http.expectOne((req) => req.url.endsWith('/reviews/mine'));
    user.set({ id: 'learner-b', role: 'STUDENT' });
    TestBed.tick();
    expect(old.cancelled).toBe(true);
    status([]);
    expect(service.mine()).toEqual([]);
    user.set(null);
    TestBed.tick();
    expect(service.state()).toBe('idle');
    expect(service.mine()).toEqual([]);
    http.expectNone((req) => req.url.endsWith('/reviews/mine'));
  });
  it('does not fetch a learner-only endpoint for staff', () => {
    status();
    user.set({ id: 'admin', role: 'ADMIN' });
    TestBed.tick();
    expect(service.eligible()).toBe(false);
    expect(service.state()).toBe('idle');
    http.expectNone((req) => req.url.endsWith('/reviews/mine'));
  });
});
