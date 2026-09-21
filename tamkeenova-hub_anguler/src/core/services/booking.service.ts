import { Injectable, signal } from '@angular/core';
import { Trainer } from '../models/trainer.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  activeTrainer = signal<Trainer | null>(null);

  // -- Select a Trainer for Booking --
  open(trainer: Trainer): void {
    this.activeTrainer.set(trainer);
  }

  // -- Clear the Active Booking Selection --
  close(): void {
    this.activeTrainer.set(null);
  }
}
