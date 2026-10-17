import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslatePipe } from '@ngx-translate/core';
import { youtubeVideoId } from '../../../core/utils/youtube';

@Component({
  selector: 'app-youtube-player',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './youtube-player.component.html',
  styleUrl: './youtube-player.component.css',
})
export class YoutubePlayerComponent {
  readonly url = input<string | null | undefined>();
  readonly title = input('');
  private readonly sanitizer = inject(DomSanitizer);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly videoId = computed(() => youtubeVideoId(this.url()));
  readonly embed = computed(() => {
    const id = this.videoId();
    return id
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
        )
      : null;
  });
  readonly external = computed(() =>
    this.videoId() ? `https://www.youtube.com/watch?v=${this.videoId()}` : null,
  );
  readonly fullscreenError = signal(false);
  async fullscreen(): Promise<void> {
    this.fullscreenError.set(false);
    try {
      if (!this.element.nativeElement.requestFullscreen) throw new Error('Unsupported');
      await this.element.nativeElement.requestFullscreen();
    } catch {
      this.fullscreenError.set(true);
    }
  }
}
