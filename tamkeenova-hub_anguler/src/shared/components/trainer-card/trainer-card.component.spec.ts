import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { TrainerCardComponent } from './trainer-card.component';
import { Trainer } from '../../../core/models/trainer.model';
import { trainerVisual, safePublicLink } from './trainer-visual';
import { SavedTrainersService } from '../../../core/services/saved-trainers.service';
import { DEFAULT_TRAINER_PORTRAIT } from '../../directives/trainer-portrait.directive';

describe('Geometric instructor card real data and semantics', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TrainerCardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en' }),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            isLoggedIn: signal(false),
            isStudent: signal(false),
          },
        },
      ],
    }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());
  function create() {
    const f = TestBed.createComponent(TrainerCardComponent);
    f.componentRef.setInput('trainer', {
      id: 'real',
      slug: 'real-instructor',
      users: { full_name: 'Real Instructor' },
      bio_en: 'English biography',
      bio_ar: 'نبذة عربية',
      specializations: { id: 'web', name_en: 'Web Development', name_ar: 'تطوير الويب' },
      average_rating: '0',
      ratings_count: 0,
      total_students: 0,
      years_of_experience: 0,
      trainer_status: 'APPROVED',
      _count: { training_programs: 0 },
    } as Trainer);
    f.detectChanges();
    return f;
  }
  it('keeps navigation links separate from save, booking and rating buttons', () => {
    const f = create();
    expect(f.nativeElement.querySelector('a button')).toBeNull();
    expect(f.nativeElement.querySelector('.trainer-card-view-details').getAttribute('href')).toBe(
      '/team/real-instructor',
    );
    expect(f.nativeElement.textContent).not.toContain('Featured instructor');
    expect(f.nativeElement.querySelector('.trainer-photo-link img').getAttribute('src')).toBe(
      DEFAULT_TRAINER_PORTRAIT,
    );
    expect(f.nativeElement.querySelector('.trainer-photo-link img').classList).toContain(
      'is-default-portrait',
    );
  });
  it('uses the selected language rather than always preferring the Arabic biography', () => {
    const f = create();
    expect(f.nativeElement.querySelector('.trainer-card-bio').textContent).toBe(
      'English biography',
    );
    TestBed.inject(TranslateService).use('ar');
    f.detectChanges();
    expect(f.nativeElement.querySelector('.trainer-card-bio').textContent).toBe('نبذة عربية');
  });
  it('keeps a useful session save if browser storage is unavailable', () => {
    const f = create();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    f.nativeElement.querySelector('.trainer-save').click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.trainer-save').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(TestBed.inject(SavedTrainersService).sessionOnly()).toBe(true);
  });
  it('uses meaningful category palettes and rejects executable social links', () => {
    expect(trainerVisual('Web Development').color).toBe('#006575');
    expect(trainerVisual('Cyber Security').color).toBe('#6346aa');
    expect(safePublicLink('javascript:alert(1)')).toBeNull();
    expect(safePublicLink('https://example.test/profile')).toBe('https://example.test/profile');
  });
});
