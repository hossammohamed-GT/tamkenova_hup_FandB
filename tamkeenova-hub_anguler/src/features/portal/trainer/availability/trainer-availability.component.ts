import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TrainerService } from '../../../../core/services/trainer.service';
import { AvailabilitySlot } from '../../../../core/models/trainer-profile.model';
import { apiErrorKey } from '../../../../core/utils/api-error';

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function timeRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('start_time')?.value;
  const end = group.get('end_time')?.value;
  if (start && end && end <= start) return { timeRange: true };
  return null;
}

// -- Convert an API Time Value for Form Input --
const toInputTime = (t: string) => t.slice(0, 5);
// -- Convert a Form Time Value for the API --
const toApiTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

@Component({
  selector: 'app-trainer-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './trainer-availability.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-availability.component.css'],
})
export class TrainerAvailabilityComponent {
  private fb = inject(FormBuilder);
  private trainerService = inject(TrainerService);

  readonly dayKeys = DAY_KEYS;
  readonly days = [0, 1, 2, 3, 4, 5, 6];

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  slots = signal<AvailabilitySlot[]>([]);

  showForm = signal(false);
  editing = signal<AvailabilitySlot | null>(null);
  isSaving = signal(false);
  formError = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      day_of_week: this.fb.nonNullable.control<number>(0, Validators.required),
      start_time: ['09:00', Validators.required],
      end_time: ['12:00', Validators.required],
    },
    { validators: timeRangeValidator },
  );

  // -- Group Availability Slots by Day and Start Time --
  grouped = computed(() =>
    this.days
      .map((day) => ({
        day,
        key: DAY_KEYS[day],
        slots: this.slots()
          .filter((s) => s.day_of_week === day)
          .sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }))
      .filter((g) => g.slots.length > 0),
  );

  totalHours = computed(() =>
    this.slots().reduce((sum, s) => {
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      return sum + (eh * 60 + em - (sh * 60 + sm)) / 60;
    }, 0),
  );

  constructor() {
    this.load();
  }

  // -- Load Availability Slots --
  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.trainerService.getAvailability().subscribe({
      next: (list) => {
        this.slots.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }

  fmt(time: string): string {
    return toInputTime(time);
  }

  // -- Open the Form for a New Availability Slot --
  openCreate(day?: number): void {
    this.editing.set(null);
    this.form.reset({ day_of_week: day ?? 0, start_time: '09:00', end_time: '12:00' });
    this.formError.set(null);
    this.showForm.set(true);
  }

  // -- Open the Form for an Existing Availability Slot --
  openEdit(slot: AvailabilitySlot): void {
    this.editing.set(slot);
    this.form.reset({
      day_of_week: slot.day_of_week,
      start_time: toInputTime(slot.start_time),
      end_time: toInputTime(slot.end_time),
    });
    this.formError.set(null);
    this.showForm.set(true);
  }

  cancel(): void {
    if (this.isSaving()) return;
    this.showForm.set(false);
    this.editing.set(null);
  }

  // -- Create or Update an Availability Slot --
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      day_of_week: Number(raw.day_of_week),
      start_time: toApiTime(raw.start_time),
      end_time: toApiTime(raw.end_time),
    };

    this.isSaving.set(true);
    this.formError.set(null);

    const current = this.editing();
    const request$ = current
      ? this.trainerService.updateAvailability(current.id, payload)
      : this.trainerService.createAvailability(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showForm.set(false);
        this.editing.set(null);
        this.load();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  // -- Delete an Availability Slot --
  remove(slot: AvailabilitySlot): void {
    this.deletingId.set(slot.id);

    this.trainerService.deleteAvailability(slot.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.slots.update((list) => list.filter((s) => s.id !== slot.id));
      },
      error: () => {
        this.deletingId.set(null);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }
}
