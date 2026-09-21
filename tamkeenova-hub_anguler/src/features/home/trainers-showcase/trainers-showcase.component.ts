import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TrainersService } from '../../../core/services/trainers.service';
import { Trainer } from '../../../core/models/trainer.model';
import { TrainerCardComponent } from '../../../shared/components/trainer-card/trainer-card.component';
import { BookingService } from '../../../core/services/booking.service';

@Component({
  selector: 'app-trainers-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, TrainerCardComponent],
  templateUrl: './trainers-showcase.component.html',
  styleUrl: './trainers-showcase.component.css',
})
export class TrainersShowcaseComponent implements OnInit {
  private trainersService = inject(TrainersService);
  private bookingService = inject(BookingService);

  // -- Open the Booking Modal for a Trainer --
  onBook(trainer: Trainer): void {
    this.bookingService.open(trainer);
  }

  isLoading = signal(true);
  trainers = signal<Trainer[]>([]);

  readonly sectionKey = 'home.team';
  readonly bookBtnKey = 'team.book_btn';

  featuredTrainers = computed(() => {
    const all = this.trainers();
    const approved = all.filter((t) => t.trainer_status === 'APPROVED');
    const featured = approved.filter((t) => t.is_featured);

    if (featured.length > 0) {
      return featured.slice(0, 8);
    }

    return approved.slice(0, 8);
  });

  allTrainersCount = computed(() => {
    return this.trainers().filter((t) => t.trainer_status === 'APPROVED').length;
  });

  ngOnInit(): void {
    this.loadTrainers();
  }

  loadTrainers(): void {
    this.trainersService.getAll().subscribe({
      next: (data: Trainer[]) => {
        if (!Array.isArray(data)) {
          this.trainers.set([]);
          this.isLoading.set(false);
          return;
        }

        this.trainers.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.trainers.set([]);
        this.isLoading.set(false);
      },
    });
  }
}
