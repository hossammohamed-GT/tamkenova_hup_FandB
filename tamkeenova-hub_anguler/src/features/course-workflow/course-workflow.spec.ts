import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CourseWorkflowService, workflowError } from '../../core/services/course-workflow.service';
import { CourseCatalogService } from '../../core/services/course-catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { CourseLearningActionsComponent } from './course-learning-actions.component';
import { CourseCheckoutComponent } from './course-checkout.component';
import { Course } from '../../core/models/course-catalog.model';
import { courseWorkflowNotificationTarget } from '../../core/utils/course-workflow-notification';
import { AppNotification } from '../../core/models/student.model';
const course = {
  id: 'course',
  slug: 'test-course',
  is_free: false,
  price: 125.5,
  title_ar: 'كورس',
  title_en: 'Course',
} as Course;
describe('Learner progress actions', () => {
  let api: any;
  beforeEach(async () => {
    api = {
      learning: vi.fn(() => throwError(() => ({ status: 403 }))),
      enroll: vi.fn(() => of({})),
      mark: vi.fn(() => of({})),
      requestCompletion: vi.fn(() => of({})),
    };
    await TestBed.configureTestingModule({
      imports: [CourseLearningActionsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: AuthService, useValue: { isLoggedIn: () => true } },
        { provide: CourseWorkflowService, useValue: api },
      ],
    }).compileComponents();
  });
  function setup() {
    const fixture = TestBed.createComponent(CourseLearningActionsComponent);
    fixture.componentRef.setInput('course', course);
    fixture.detectChanges();
    return fixture;
  }
  it('does not infer paid enrollment from being logged in', () => {
    const fixture = setup();
    expect(fixture.componentInstance.state()).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href$="/checkout"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.completion-names')).toBeNull();
  });
  it('marks only the selected lesson via owned course endpoint', () => {
    const fixture = setup();
    fixture.componentRef.setInput('lesson', { id: 'lesson' });
    fixture.detectChanges();
    fixture.componentInstance.mark();
    expect(api.mark).toHaveBeenCalledWith('course', 'lesson');
  });
  it('never posts a mark for the introductory video', () => {
    const fixture = setup();
    fixture.componentInstance.mark();
    expect(api.mark).not.toHaveBeenCalled();
  });
  it('preserves certificate names when requesting instructor confirmation', () => {
    api.learning.mockReturnValue(
      of({
        status: 'ACTIVE',
        progress: 100,
        completion_state: 'NOT_REQUESTED',
        lesson_progress: [],
      }),
    );
    const fixture = setup();
    fixture.componentInstance.nameAr = 'ليلى أحمد';
    fixture.componentInstance.nameEn = 'Layla Ahmed';
    fixture.componentInstance.request();
    expect(api.requestCompletion).toHaveBeenCalledWith('course', {
      recipient_name_ar: 'ليلى أحمد',
      recipient_name_en: 'Layla Ahmed',
    });
  });
  it('a pending completion request cannot offer duplicate submission', () => {
    api.learning.mockReturnValue(
      of({ status: 'ACTIVE', progress: 100, completion_state: 'PENDING' }),
    );
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('.completion-names')).toBeNull();
    expect(fixture.nativeElement.querySelector('.notice')).toBeTruthy();
  });
  it('shows download navigation only once the instructor has completed the enrollment', () => {
    api.learning.mockReturnValue(
      of({ status: 'COMPLETED', progress: 100, completion_state: 'APPROVED' }),
    );
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('a.button[href="/my-courses"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.completion-names')).toBeNull();
  });
});
describe('Checkout state and safe report submission', () => {
  let api: any;
  beforeEach(async () => {
    api = {
      checkout: vi.fn(() =>
        of({
          course,
          methods: [],
          requests: [],
          enrollment: null,
          payment_enabled: false,
          quote_token: null,
        }),
      ),
      report: vi.fn(() => of({})),
    };
    await TestBed.configureTestingModule({
      imports: [CourseCheckoutComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: CourseCatalogService, useValue: { getCourseBySlug: () => of(course) } },
        { provide: CourseWorkflowService, useValue: api },
      ],
    }).compileComponents();
  });
  it('missing destinations never show a transfer-report form or a fake account', () => {
    const fixture = TestBed.createComponent(CourseCheckoutComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.account')).toBeNull();
  });
  it('will not submit without the signed quote and actual-transfer acknowledgement', () => {
    const component = TestBed.createComponent(CourseCheckoutComponent).componentInstance;
    component.submit();
    expect(api.report).not.toHaveBeenCalled();
    component.data.set({ ...component.data()!, quote_token: 'signed' });
    component.submit();
    expect(api.report).not.toHaveBeenCalled();
  });
  it('keeps transferred amounts distinct from the expected price', () => {
    const component = TestBed.createComponent(CourseCheckoutComponent).componentInstance;
    component.accept({
      course: course as any,
      methods: [{ method: 'INSTAPAY', account: 'test-only@instapay' }],
      requests: [],
      enrollment: null,
      payment_enabled: true,
      quote_token: 'signed',
    });
    component.confirmed = true;
    component.sender = 'sender';
    component.amount = 120;
    component.transferredAt = '2026-10-17T10:30';
    component.submit();
    expect(api.report.mock.calls[0][1]).toMatchObject({
      quote_token: 'signed',
      reported_amount: 120,
      sender_account: 'sender',
      method: 'INSTAPAY',
    });
  });
  it('invalid datetime never throws or sends a report', () => {
    const component = TestBed.createComponent(CourseCheckoutComponent).componentInstance;
    component.data.set({ ...component.data()!, quote_token: 'signed' });
    component.confirmed = true;
    component.transferredAt = 'invalid';
    expect(() => component.submit()).not.toThrow();
    expect(api.report).not.toHaveBeenCalled();
    expect(component.feedback.fields()['transferred_at']).toBeTruthy();
  });
});
describe('Workflow notification routing and errors', () => {
  it('maps separate publication, transfer, teacher and learner notifications to their proper queues', () => {
    for (const [type, route] of [
      ['COURSE_REVIEW', '/portal/admin/course-workflow'],
      ['COURSE_PAYMENT', '/portal/admin/course-workflow'],
      ['COURSE_COMPLETION', '/portal/trainer/courses'],
      ['COURSE_AUTHOR', '/portal/trainer/courses'],
      ['COURSE_CERTIFICATE', '/my-courses'],
      ['COURSE_LEARNING', '/my-courses'],
    ])
      expect(
        courseWorkflowNotificationTarget({ reference_type: type } as AppNotification)?.commands,
      ).toEqual([route]);
    expect(
      courseWorkflowNotificationTarget({ reference_type: 'COURSE_PAYMENT' } as AppNotification)
        ?.queryParams,
    ).toEqual({ tab: 'payments' });
    expect(
      courseWorkflowNotificationTarget({ reference_type: 'https://evil.test' } as AppNotification),
    ).toBeNull();
  });
  it('surfaces API validation reasons, without stringifying entire response objects', () => {
    expect(workflowError({ error: { message: ['One', 'Two'] } })).toBe('One · Two');
    expect(workflowError({ error: { message: 'Conflict' } })).toBe('Conflict');
    expect(workflowError({})).toContain('Please retry');
  });
});
