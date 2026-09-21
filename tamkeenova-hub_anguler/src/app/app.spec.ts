import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';

// -- Boots the app with the REAL app config (router + i18n + theme + interceptors) --
describe('App bootstrap', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [...appConfig.providers],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('boots and renders the home route without crashing', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    await router.navigate(['/']);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent?.trim().length).toBeGreaterThan(0);
  });
});
