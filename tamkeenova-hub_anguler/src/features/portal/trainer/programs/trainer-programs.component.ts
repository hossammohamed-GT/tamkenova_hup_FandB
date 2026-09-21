import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TrainerService } from '../../../../core/services/trainer.service';
import { apiErrorKey } from '../../../../core/utils/api-error';
import {
  ProgramLevel,
  ProgramPayload,
  TrainerProgram,
} from '../../../../core/models/trainer-profile.model';

const URL_PATTERN = /^https?:\/\/.+/;

@Component({
  selector: 'app-trainer-programs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './trainer-programs.component.html',
  styleUrls: ['../../portal-shared.css', './trainer-programs.component.css'],
})
export class TrainerProgramsComponent {
  private fb = inject(FormBuilder);
  private trainerService = inject(TrainerService);

  readonly levels: ProgramLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  programs = signal<TrainerProgram[]>([]);

  showModal = signal(false);
  editing = signal<TrainerProgram | null>(null);
  isSaving = signal(false);
  formError = signal<string | null>(null);

  confirmDeleteId = signal<string | null>(null);
  isDeleting = signal(false);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    image_url: ['', [Validators.pattern(URL_PATTERN)]],
    short_description: ['', [Validators.maxLength(160)]],
    description: [''],
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    discount_price: this.fb.control<number | null>(null, [Validators.min(0)]),
    duration_hours: this.fb.control<number | null>(null, [Validators.min(1)]),
    level: this.fb.nonNullable.control<ProgramLevel>('BEGINNER', Validators.required),
  });

  constructor() {
    this.load();
  }

  // -- Load Trainer Programs --
  load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.trainerService.getPrograms().subscribe({
      next: (list) => {
        this.programs.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }

  levelKey(level: ProgramLevel): string {
    return `programs.level.${level.toLowerCase()}`;
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  // -- Open the Form for a New Program --
  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ level: 'BEGINNER' });
    this.formError.set(null);
    this.showModal.set(true);
  }

  // -- Open the Form for an Existing Program --
  openEdit(program: TrainerProgram): void {
    this.editing.set(program);
    this.form.reset({
      title: program.title,
      image_url: program.image_url ?? '',
      short_description: program.short_description ?? '',
      description: program.description ?? '',
      price: Number(program.price),
      discount_price: program.discount_price != null ? Number(program.discount_price) : null,
      duration_hours: program.duration_hours ?? null,
      level: program.level,
    });
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    if (this.isSaving()) return;
    this.showModal.set(false);
    this.editing.set(null);
  }

  // -- Create or Update a Trainer Program --
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (raw.discount_price != null && raw.price != null && raw.discount_price >= raw.price) {
      this.formError.set('trainer_programs.errors.discount_gte_price');
      return;
    }

    const payload: ProgramPayload = {
      title: raw.title,
      image_url: raw.image_url || undefined,
      short_description: raw.short_description || undefined,
      description: raw.description || undefined,
      price: raw.price!,
      discount_price: raw.discount_price ?? undefined,
      duration_hours: raw.duration_hours ?? undefined,
      level: raw.level,
    };

    this.isSaving.set(true);
    this.formError.set(null);

    const current = this.editing();
    const request$ = current
      ? this.trainerService.updateProgram(current.id, payload)
      : this.trainerService.createProgram(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showModal.set(false);
        this.editing.set(null);
        this.load();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formError.set(apiErrorKey(err, 'auth.errors.generic'));
      },
    });
  }

  // -- Request Program Deletion Confirmation --
  askDelete(id: string): void {
    this.confirmDeleteId.set(id);
  }

  // -- Dismiss the Program Deletion Confirmation --
  cancelDelete(): void {
    if (this.isDeleting()) return;
    this.confirmDeleteId.set(null);
  }

  // -- Delete the Confirmed Program --
  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (!id) return;

    this.isDeleting.set(true);
    this.trainerService.deleteProgram(id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.confirmDeleteId.set(null);
        this.programs.update((list) => list.filter((p) => p.id !== id));
      },
      error: () => {
        this.isDeleting.set(false);
        this.confirmDeleteId.set(null);
        this.errorMessage.set('auth.errors.generic');
      },
    });
  }
}
