import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor, isApiRequest } from './auth.interceptor';

describe('Bearer-token destination and response isolation', () => {
  const base = 'https://app.example.test/';
  for (const url of ['/api/trainers', '/api', 'https://app.example.test/api/auth/me']) {
    it(`recognizes the exact API boundary: ${url}`, () =>
      expect(isApiRequest(url, '/api', base)).toBe(true));
  }
  for (const url of [
    'https://evil.test/api/trainers',
    '//evil.test/api/trainers',
    '/apiary',
    '/i18n/en.json',
    '/assets/image.svg',
    'javascript:alert(1)',
  ]) {
    it(`never attaches a bearer token outside the API: ${url}`, () =>
      expect(isApiRequest(url, '/api', base)).toBe(false));
  }
  it('does not leak tokens or log out the learner when a third-party request returns 401', () => {
    const logout = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'private-token', logout } },
      ],
    });
    const http = TestBed.inject(HttpClient),
      controller = TestBed.inject(HttpTestingController);
    http.get('https://evil.test/image').subscribe({ error: () => undefined });
    const remote = controller.expectOne('https://evil.test/image');
    expect(remote.request.headers.has('Authorization')).toBe(false);
    remote.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(logout).not.toHaveBeenCalled();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    http.get('/api/private').subscribe({ error: () => undefined });
    const own = controller.expectOne('/api/private');
    expect(own.request.headers.get('Authorization')).toBe('Bearer private-token');
    own.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(logout).toHaveBeenCalledWith(false);
    controller.verify();
  });
});
