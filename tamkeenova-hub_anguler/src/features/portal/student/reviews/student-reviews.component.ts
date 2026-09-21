import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StudentService } from '../../../../core/services/student.service';
import { StudentReview } from '../../../../core/models/student.model';

@Component({
  selector: 'app-student-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './student-reviews.component.html',
  styleUrls: ['../../portal-shared.css', './student-reviews.component.css'],
})
export class StudentReviewsComponent {
  private studentService = inject(StudentService);

  isLoading = signal(true);
  reviews = signal<StudentReview[]>([]);

  editTarget = signal<StudentReview | null>(null);
  editRating = signal(5);
  editComment = signal('');
  isSaving = signal(false);

  deleteTarget = signal<StudentReview | null>(null);
  isDeleting = signal(false);
  toastMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.studentService.getMyReviews().subscribe({
      next: (res) => {
        this.reviews.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openEdit(review: StudentReview): void {
    this.editTarget.set(review);
    this.editRating.set(review.rating);
    this.editComment.set(review.comment ?? '');
  }

  closeEdit(): void {
    this.editTarget.set(null);
  }

  setRating(n: number): void {
    this.editRating.set(n);
  }

  saveEdit(): void {
    const target = this.editTarget();
    if (!target || this.isSaving()) return;
    this.isSaving.set(true);
    this.studentService
      .updateReview(target.id, {
        rating: this.editRating(),
        comment: this.editComment().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.reviews.update((list) =>
            list.map((r) =>
              r.id === target.id
                ? { ...r, rating: this.editRating(), comment: this.editComment().trim() || null }
                : r,
            ),
          );
          this.isSaving.set(false);
          this.closeEdit();
          this.showToast('student_reviews.update_success');
        },
        error: () => this.isSaving.set(false),
      });
  }

  askDelete(review: StudentReview): void {
    this.deleteTarget.set(review);
  }

  closeDelete(): void {
    this.deleteTarget.set(null);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.studentService.deleteReview(target.id).subscribe({
      next: () => {
        this.reviews.update((list) => list.filter((r) => r.id !== target.id));
        this.isDeleting.set(false);
        this.closeDelete();
        this.showToast('student_reviews.delete_success');
      },
      error: () => this.isDeleting.set(false),
    });
  }

  private showToast(key: string): void {
    this.toastMessage.set(key);
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
