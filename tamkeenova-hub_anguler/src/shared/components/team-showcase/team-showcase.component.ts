import { Component, computed, input, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Trainer } from '../../../core/models/trainer.model';
import { StarRatingComponent } from '../star-rating/star-rating.component';

interface TrainerSlot {
  currentTrainer: Trainer;
  nextTrainer: Trainer;
  sliding: boolean;
  resetting: boolean;
}

@Component({
  selector: 'app-team-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, StarRatingComponent],
  templateUrl: './team-showcase.component.html',
  styleUrl: './team-showcase.component.css',
})
export class TeamShowcaseComponent implements OnDestroy {
  trainers = input.required<Trainer[]>();

  private readonly slotsCount = 4;
  private readonly staggerMs = 280;
  private readonly slideDurationMs = 700;
  private readonly wavePauseMs = 3000;

  private slotPointers: number[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];

  slots = signal<TrainerSlot[]>([]);

  // ✅ دالة لحساب الـ rating
  getTrainerRating(trainer: Trainer): number {
    if (!trainer.average_rating) return 0;

    if (typeof trainer.average_rating === 'string') {
      const parsed = parseFloat(trainer.average_rating);
      return isNaN(parsed) ? 0 : parsed;
    }

    return Number(trainer.average_rating) || 0;
  }

  // ✅ دالة للحصول على الاسم
  getTrainerName(trainer: Trainer): string {
    return trainer.users?.full_name || 'Unknown';
  }

  // ✅ دالة للحصول على التخصص
  getTrainerSpecialization(trainer: Trainer): string {
    return trainer.specializations?.name_ar || trainer.specializations?.name_en || '';
  }

  // ✅ دالة للحصول على الصورة
  getTrainerAvatar(trainer: Trainer): string | null {
    return trainer.users?.profile_image || null;
  }

  constructor() {
    this.initMarquee();
  }

  ngOnDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
  }

  private initMarquee(): void {
    const list = this.trainers();
    if (list.length === 0) return;

    const initial = list.slice(0, Math.min(this.slotsCount, list.length));
    this.slotPointers = initial.map((_, i) => i);

    this.slots.set(
      initial.map((trainer) => ({
        currentTrainer: trainer,
        nextTrainer: trainer,
        sliding: false,
        resetting: false,
      })),
    );

    const prefersReduced = (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
    if (prefersReduced) return;

    const t = setTimeout(() => {
      this.runWave();
      this.scheduleNextWave();
    }, 1500);
    this.timers.push(t);
  }

  private scheduleNextWave(): void {
    const waveDuration = (this.slotsCount - 1) * this.staggerMs + this.slideDurationMs;
    const totalDelay = waveDuration + this.wavePauseMs;

    const t = setTimeout(() => {
      this.runWave();
      this.scheduleNextWave();
    }, totalDelay);
    this.timers.push(t);
  }

  private runWave(): void {
    for (let i = 0; i < this.slotsCount; i++) {
      const t = setTimeout(() => this.startSlide(i), i * this.staggerMs);
      this.timers.push(t);
    }
  }

  private startSlide(idx: number): void {
    const current = this.slots();
    const nextTrainer = this.pickNextTrainer(idx);

    const updated = [...current];
    updated[idx] = { ...updated[idx], nextTrainer, sliding: true };
    this.slots.set(updated);

    const t = setTimeout(() => this.finishSlide(idx), this.slideDurationMs);
    this.timers.push(t);
  }

  private finishSlide(idx: number): void {
    const s = this.slots();
    const updated = [...s];
    updated[idx] = {
      currentTrainer: updated[idx].nextTrainer,
      nextTrainer: updated[idx].nextTrainer,
      sliding: false,
      resetting: true,
    };
    this.slots.set(updated);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const s2 = this.slots();
        const u2 = [...s2];
        u2[idx] = { ...u2[idx], resetting: false };
        this.slots.set(u2);
      });
    });
  }

  private pickNextTrainer(slotIdx: number): Trainer {
    const list = this.trainers();
    const total = list.length;
    const ptr = (this.slotPointers[slotIdx] + 1) % total;
    this.slotPointers[slotIdx] = ptr;
    return list[ptr];
  }
}
