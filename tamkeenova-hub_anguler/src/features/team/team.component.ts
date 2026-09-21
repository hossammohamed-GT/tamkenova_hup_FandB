import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TrainersService } from '../../core/services/trainers.service';
import { Trainer } from '../../core/models/trainer.model';
import { TrainerCardComponent } from '../../shared/components/trainer-card/trainer-card.component';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TrainerCardComponent],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css',
})
export class TeamComponent implements OnInit {
  private trainersService = inject(TrainersService);
  private bookingService = inject(BookingService);

  // -- Open the Booking Modal for a Trainer --
  onBook(trainer: Trainer): void {
    this.bookingService.open(trainer);
  }

  trainers = signal<Trainer[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTrainers();
  }

  loadTrainers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.trainersService.getAll().subscribe({
      next: (data: Trainer[]) => {
        if (!Array.isArray(data)) {
          this.trainers.set([]);
          this.isLoading.set(false);
          return;
        }

        const approved = data.filter((t) => t.trainer_status === 'APPROVED');
        this.trainers.set(approved);
        this.isLoading.set(false);
      },
      error: () => {
        this.trainers.set([]);
        this.errorMessage.set('Failed to load trainers');
        this.isLoading.set(false);
      },
    });
  }
}
