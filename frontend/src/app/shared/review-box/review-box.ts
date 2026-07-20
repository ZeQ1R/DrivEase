import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolsService } from '../../schools/schools.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-review-box',
  imports: [FormsModule],
  templateUrl: './review-box.html',
  styleUrl: './review-box.css',
})
export class ReviewBox {
  private schools = inject(SchoolsService);
  private toast = inject(ToastService);

  schoolId = input<number | null>(null);

  canReview = signal(false);
  hasReviewed = signal(false);
  average = signal(0);
  count = signal(0);
  rating = 0;
  comment = '';
  saving = signal(false);

  constructor() {
    effect(() => {
      const id = this.schoolId();
      if (id != null) this.load(id);
    });
  }

  private load(id: number) {
    this.schools.getReviews(id).subscribe({
      next: (res) => {
        this.canReview.set(res.canReview);
        this.average.set(res.average);
        this.count.set(res.count);
        this.hasReviewed.set(!!res.myReview);
        if (res.myReview) {
          this.rating = res.myReview.rating;
          this.comment = res.myReview.comment ?? '';
        }
      },
      error: (err) => console.error('Failed to load reviews', err),
    });
  }

  setRating(n: number) { this.rating = n; }

  submit() {
    const id = this.schoolId();
    if (id == null) return;
    if (this.rating < 1) { this.toast.error('Please pick a star rating.'); return; }
    this.saving.set(true);
    this.schools.submitReview(id, this.rating, this.comment).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.hasReviewed() ? 'Review updated!' : 'Thanks for your review!');
        this.load(id);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message || 'Failed to submit review.');
      },
    });
  }
}
