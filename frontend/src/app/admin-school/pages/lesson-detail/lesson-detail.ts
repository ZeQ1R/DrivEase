import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminSchoolService, Lesson } from '../../admin-school.service';
import { lessonStatus, lessonTitle, STATUS_LABEL } from '../../lesson.utils';

@Component({
  selector: 'app-lesson-detail',
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './lesson-detail.html',
  styleUrl: './lesson-detail.css',
})
export class LessonDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminService = inject(AdminSchoolService);

  private id = Number(this.route.snapshot.paramMap.get('id'));

  readonly statusLabel = STATUS_LABEL;
  readonly title = lessonTitle;

  schoolName = signal('');
  lessons = signal<Lesson[]>([]);
  loading = signal(true);
  message = signal('');
  busy = signal(false);
  confirmDelete = signal(false);

  lesson = computed(() => this.lessons().find(l => l.id === this.id) ?? null);
  status = computed(() => (this.lesson() ? lessonStatus(this.lesson()!) : 'open'));

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({ next: (r) => this.schoolName.set(r.schoolName) });
    this.adminService.getLessons().subscribe({
      next: (res) => { this.lessons.set(res.lessons); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // a Date object for the pipe, built from the plain date string (avoids timezone shifts)
  dateObj(l: Lesson) {
    const [y, m, d] = l.slot_date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  initials(first: string | null, last: string | null) {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  }

  markAttended(l: Lesson) {
    if (!l.booking_id) return;
    this.busy.set(true);
    this.message.set('');
    this.adminService.markLessonAttended(l.booking_id).subscribe({
      next: () => {
        this.lessons.update(list => list.map(x => (x.id === l.id ? { ...x, attended: true } : x)));
        this.busy.set(false);
      },
      error: (err) => { this.message.set(err.error?.message || 'Could not mark attendance.'); this.busy.set(false); },
    });
  }

  removeSlot(l: Lesson) {
    this.busy.set(true);
    this.adminService.deleteSlot(l.id).subscribe({
      next: () => this.router.navigate(['/school-admin-dashboard/schedules']),
      error: (err) => {
        this.message.set(err.error?.message || 'Could not delete this lesson.');
        this.busy.set(false);
        this.confirmDelete.set(false);
      },
    });
  }
}