import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface Star {
  top: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
}

interface Orb {
  top: number;
  left: number;
  size: number;
  depth: number;
  duration: number;
  variant: 'primary' | 'accent';
}

interface Fragment {
  top: number;
  left: number;
  width: number;
  height: number;
  depth: number;
  duration: number;
  delay: number;
  rotate: number;
}

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {
  @ViewChild('stage') private stageRef?: ElementRef<HTMLDivElement>;

  // -- Animated Star Field --
  readonly stars: Star[] = Array.from({ length: 50 }, () => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 4,
    duration: 2.5 + Math.random() * 2.5,
  }));

  // -- Background Orb Configuration --
  readonly orbs: Orb[] = [
    { top: 18, left: 12, size: 320, depth: 14, duration: 16, variant: 'primary' },
    { top: 68, left: 80, size: 380, depth: 18, duration: 20, variant: 'accent' },
    { top: 78, left: 20, size: 240, depth: 10, duration: 13, variant: 'primary' },
  ];

  // -- Floating Fragment Configuration --
  readonly fragments: Fragment[] = [
    { top: 14, left: 10, width: 90, height: 26, depth: 32, duration: 7, delay: 0, rotate: -8 },
    { top: 68, left: 8, width: 26, height: 96, depth: 40, duration: 9, delay: 0.6, rotate: 6 },
    { top: 60, left: 84, width: 26, height: 110, depth: 36, duration: 8, delay: 1.1, rotate: -5 },
    { top: 20, left: 78, width: 78, height: 24, depth: 44, duration: 6.5, delay: 0.4, rotate: 10 },
    { top: 78, left: 46, width: 24, height: 70, depth: 28, duration: 10, delay: 0.9, rotate: -4 },
  ];

  // -- Apply a Pointer-Based Parallax Effect --
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    stage.style.setProperty('--px', `${px}`);
    stage.style.setProperty('--py', `${py}`);
  }

  // -- Reset the Parallax Effect --
  onMouseLeave(): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage) return;
    stage.style.setProperty('--px', '0');
    stage.style.setProperty('--py', '0');
  }
}
