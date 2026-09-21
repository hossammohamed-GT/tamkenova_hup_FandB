import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BookingService } from '../../../core/services/booking.service';
import { ConsultationService } from '../../../core/services/consultation.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorKey } from '../../../core/utils/api-error';

type ContactMethod = 'whatsapp' | 'phone' | 'email';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './booking-modal.component.html',
  styleUrl: './booking-modal.component.css',
})
export class BookingModalComponent {
  bookingService = inject(BookingService);
  private consultationService = inject(ConsultationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  trainer = computed(() => this.bookingService.activeTrainer());
  isOpen = computed(() => this.trainer() !== null);
  isLoggedIn = this.authService.isLoggedIn;
  isStudent = this.authService.isStudent;
  currentUser = this.authService.currentUser;

  trainerName = computed(() => {
    const t = this.trainer();
    if (!t) return '';
    return t.users?.full_name ?? t.name ?? '';
  });

  trainerAvatar = computed(() => {
    const t = this.trainer();
    if (!t) return null;
    return t.users?.profile_image ?? t.avatar ?? null;
  });

  trainerSpec = computed(() => {
    const t = this.trainer();
    if (!t) return '';
    return (
      t.specializations?.name_ar ?? t.specializations?.name_en ?? t.specialization ?? ''
    );
  });

  title = signal('');
  topic = signal('');
  phone = signal('');
  preferredDate = signal('');
  preferredTime = signal('');
  notes = signal('');
  contactMethod = signal<ContactMethod>('whatsapp');

  submitting = signal(false);
  submitted = signal(false);
  touched = signal(false);
  submitError = signal<string | null>(null);

  isValid = computed(() => this.title().trim() !== '' && this.topic().trim() !== '');

  constructor() {
    // -- Pre-fill the contact phone from the logged-in user --
    effect(() => {
      const user = this.currentUser();
      const isOpen = this.isOpen();
      if (isOpen && user?.phone && !this.phone()) {
        this.phone.set(user.phone);
      }
    });
  }

  setContactMethod(method: ContactMethod): void {
    this.contactMethod.set(method);
  }

  submit(): void {
    this.touched.set(true);
    const trainer = this.trainer();
    if (!this.isValid() || this.submitting() || !trainer || !this.isStudent()) return;

    this.submitting.set(true);
    this.submitError.set(null);

    this.consultationService
      .create({
        trainer_id: trainer.id,
        title: this.title().trim(),
        description: this.topic().trim(),
        preferred_date: this.preferredDate() || undefined,
        preferred_time: this.preferredTime() || undefined,
        contact_phone: this.phone().trim() || undefined,
        preferred_contact_method: this.contactMethod(),
        student_notes: this.notes().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitError.set(apiErrorKey(err, 'auth.errors.generic'));
        },
      });
  }

  goToLogin(): void {
    const wasOpen = this.isOpen();
    this.close();
    if (wasOpen) this.router.navigate(['/login']);
  }

  goToConsultations(): void {
    const wasOpen = this.isOpen();
    this.close();
    if (wasOpen) this.router.navigate(['/portal/student/consultations']);
  }

  close(): void {
    this.bookingService.close();

    setTimeout(() => {
      this.title.set('');
      this.topic.set('');
      this.phone.set('');
      this.preferredDate.set('');
      this.preferredTime.set('');
      this.notes.set('');
      this.contactMethod.set('whatsapp');
      this.submitting.set(false);
      this.submitted.set(false);
      this.touched.set(false);
      this.submitError.set(null);
    }, 300);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
