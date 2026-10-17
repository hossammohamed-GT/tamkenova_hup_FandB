import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { YoutubePlayerComponent } from './youtube-player.component';
describe('Branded YouTube player', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YoutubePlayerComponent],
      providers: [provideTranslateService()],
    }).compileComponents();
  });
  it('embeds only the video ID on the privacy-enhanced host and keeps branding outside the iframe', () => {
    const fixture = TestBed.createComponent(YoutubePlayerComponent);
    fixture.componentRef.setInput('url', 'https://youtu.be/5BciHXh074k?list=RD5BciHXh074k');
    fixture.componentRef.setInput('title', 'Introduction');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const iframe = host.querySelector('iframe')!;
    expect(iframe.src).toBe(
      'https://www.youtube-nocookie.com/embed/5BciHXh074k?rel=0&playsinline=1',
    );
    expect(iframe.title).toBe('Introduction');
    expect(host.querySelector('.video-brand img')?.getAttribute('src')).toBe('/images/logo.svg');
    expect(host.querySelector('.video-help a')?.getAttribute('href')).toBe(
      'https://www.youtube.com/watch?v=5BciHXh074k',
    );
  });
  it('never renders an iframe or external link for an untrusted URL', () => {
    const fixture = TestBed.createComponent(YoutubePlayerComponent);
    fixture.componentRef.setInput('url', 'https://evil.test/embed/5BciHXh074k');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.nativeElement.querySelector('.video-help a')).toBeNull();
  });
  it('requests fullscreen on the entire branded component and handles unsupported browsers', async () => {
    const fixture = TestBed.createComponent(YoutubePlayerComponent);
    const request = vi.fn().mockResolvedValue(undefined);
    fixture.nativeElement.requestFullscreen = request;
    await fixture.componentInstance.fullscreen();
    expect(request).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.fullscreenError()).toBe(false);
    fixture.nativeElement.requestFullscreen = undefined;
    await fixture.componentInstance.fullscreen();
    expect(fixture.componentInstance.fullscreenError()).toBe(true);
  });
});
