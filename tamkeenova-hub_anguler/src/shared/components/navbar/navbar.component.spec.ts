import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { NavbarComponent } from './navbar.component';

describe('Programs menu deferred keyboard focus', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en' }),
      ],
    })
      .overrideComponent(NavbarComponent, {
        set: {
          template:
            '<button id="programs-menu-trigger">Programs</button><button class="mega-category">Category</button>',
          imports: [],
        },
      })
      .compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());

  function create() {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const target = fixture.nativeElement.querySelector('.mega-category') as HTMLButtonElement;
    const focus = vi.spyOn(target, 'focus');
    return { fixture, callbacks, cancel, focus, component: fixture.componentInstance };
  }

  it('focuses a category on the next frame while the menu is open', () => {
    const { component, callbacks, focus } = create();
    component.focusProgramsMenu(new Event('keydown'));
    callbacks[0](0);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('Escape cancels the pending frame and a late callback cannot steal restored focus', () => {
    const { component, callbacks, cancel, focus } = create();
    component.focusProgramsMenu(new Event('keydown'));
    component.onEscape();
    expect(cancel).toHaveBeenCalledWith(1);
    callbacks[0](0); // Simulate an already-dispatched frame during panel teardown.
    expect(component.isProgramsMenuOpen()).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });

  it('cancels pending keyboard focus when the navbar is destroyed', () => {
    const { fixture, component, callbacks, cancel, focus } = create();
    component.focusProgramsMenu(new Event('keydown'));
    fixture.destroy();
    expect(cancel).toHaveBeenCalledWith(1);
    callbacks[0](0);
    expect(focus).not.toHaveBeenCalled();
  });
});
