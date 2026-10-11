import { Injectable, signal } from '@angular/core';
import { Trainer } from '../models/trainer.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  activeTrainer = signal<Trainer | null>(null);

  open(trainer: Trainer): void {
    this.activeTrainer.set(trainer);
  }

  close(): void {
    this.activeTrainer.set(null);
  }
}
