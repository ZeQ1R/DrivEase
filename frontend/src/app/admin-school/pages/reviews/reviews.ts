import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AdminReview, AdminSchoolService } from '../../admin-school.service';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';

type Tab = 'all' | 'needs' | 'replied'


@Component({
  selector: 'app-reviews',
  imports: [FormsModule,DatePipe,DecimalPipe,UpperCasePipe],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class Reviews implements OnInit{
  private adminService = inject(AdminSchoolService)

  readonly stars = [1,2,3,4,5]

  schoolName = signal('')
  reviews = signal<AdminReview[]>([]);
  loading = signal(true)
  error = signal('')

  tab = signal<Tab>('all')
  search = signal('')
  ratingFilter = signal('')
  sort = signal<'newest' | 'highest' | 'lowest'>('newest')

  replyingId = signal<number | null>(null)
  draft = ''
  saving = signal(false)
  Math_round = Math.round;

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({ next: (r) => this.schoolName.set(r.schoolName) });
    this.adminService.getReviews().subscribe({
      next: (res) => { this.reviews.set(res.reviews); this.loading.set(false); },
      error: () => { this.error.set('Could not load reviews.'); this.loading.set(false); },
    });
  }

  total = computed(() => this.reviews().length);
  average = computed(() => {
    const list = this.reviews();
    return list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
  });
  needsReply = computed(() => this.reviews().filter(r => !r.reply).length);
  repliedCount = computed(() => this.reviews().filter(r => !!r.reply).length);
  positiveShare = computed(() =>
    this.total() ? Math.round((this.reviews().filter(r => r.rating >= 4).length / this.total()) * 100) : 0
  );

  // for the bars: 5 -> 1 stars with count and percentage
  distribution = computed(() =>
    [5, 4, 3, 2, 1].map(n => {
      const count = this.reviews().filter(r => r.rating === n).length;
      return { stars: n, count, percent: this.total() ? (count / this.total()) * 100 : 0 };
    })
  );

  // ---------- list ----------
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rating = this.ratingFilter();
    const list = this.reviews().filter(r => {
      if (this.tab() === 'needs' && r.reply) return false;
      if (this.tab() === 'replied' && !r.reply) return false;
      if (rating && r.rating !== Number(rating)) return false;
      if (q && !`${r.first_name} ${r.last_name} ${r.comment ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const s = this.sort();
    return [...list].sort((a, b) =>
      s === 'highest' ? b.rating - a.rating
      : s === 'lowest' ? a.rating - b.rating
      : +new Date(b.created_at) - +new Date(a.created_at)
    );
  });

  initials(r: AdminReview) {
    return `${r.first_name[0] ?? ''}${r.last_name[0] ?? ''}`.toUpperCase();
  }

  // ---------- reply ----------
  startReply(r: AdminReview) {
    this.replyingId.set(r.id);
    this.draft = r.reply ?? '';
    this.error.set('');
  }

  cancelReply() { this.replyingId.set(null); this.draft = ''; }

  saveReply(r: AdminReview) {
    if (this.saving()) return;
    this.saving.set(true);
    this.adminService.replyToReview(r.id, this.draft).subscribe({
      next: (res) => {
        this.reviews.update(list =>
          list.map(x => (x.id === r.id ? { ...x, reply: res.reply, replied_at: res.replied_at } : x))
        );
        this.saving.set(false);
        this.cancelReply();
      },
      error: (err) => { this.error.set(err.error?.message || 'Could not save the reply.'); this.saving.set(false); },
    });
  }

  removeReply(r: AdminReview) {
    this.adminService.replyToReview(r.id, '').subscribe({
      next: () => this.reviews.update(list => list.map(x => (x.id === r.id ? { ...x, reply: null, replied_at: null } : x))),
      error: (err) => this.error.set(err.error?.message || 'Could not remove the reply.'),
    });
  }
}
