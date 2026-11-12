import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminSchoolService, Instructor, Lesson } from '../../admin-school.service';
import { lessonStart, lessonStatus, lessonTitle, mondayOf, STATUS_LABEL, ymd } from '../../lesson.utils';

const ROW = 64; // px per hour, must match .hour-row height in the css

@Component({
  selector: 'app-schedules',
  imports: [RouterLink, DatePipe, UpperCasePipe, FormsModule],
  templateUrl: './schedules.html',
  styleUrl: './schedules.css',
})
export class Schedules implements OnInit {
  private adminService = inject(AdminSchoolService);

  readonly ROW = ROW;
  readonly statusLabel = STATUS_LABEL;
  readonly title = lessonTitle;
  readonly status = lessonStatus;
  readonly todayKey = ymd(new Date());

  schoolName = signal('');
  lessons = signal<Lesson[]>([]);
  instructors = signal<Instructor[]>([]);

  weekStart = signal(mondayOf(new Date()));
  view = signal<'week' | 'list'>('week');
  instructorFilter = signal('');
  typeFilter = signal('');
  statusFilter = signal('');

  // ---------- schedule form ----------
  showForm = signal(false);
  saving = signal(false);
  formMessage = signal('');
  newType = signal<'theory' | 'practical'>('theory');
  newDate = '';
  newTime = '';
  newDuration = 1.5;
  newInstructor: number | null = null;
  newRepeat = 1;
  newNote = '';

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({ next: (r) => this.schoolName.set(r.schoolName) });
    this.adminService.getInstructors().subscribe({ next: (r) => this.instructors.set(r.instructors) });
    this.load();
  }

  load() {
    this.adminService.getLessons().subscribe({
      next: (res) => this.lessons.set(res.lessons),
      error: (err) => console.error('Failed to load lessons', err),
    });
  }

  // ---------- filtering ----------
  filtered = computed(() => {
    const instr = this.instructorFilter(), type = this.typeFilter(), st = this.statusFilter();
    return this.lessons().filter(l => {
      if (instr && String(l.instructor_id) !== instr) return false;
      if (type && l.slot_type !== type) return false;
      if (st && lessonStatus(l) !== st) return false;
      return true;
    });
  });

  // ---------- week ----------
  days = computed(() => {
    const todayKey = ymd(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStart());
      d.setDate(d.getDate() + i);
      return { date: d, key: ymd(d), isToday: ymd(d) === todayKey, isPast: ymd(d) < todayKey };
    });
  });

  weekLabel = computed(() => {
    const d = this.days();
    const fmt = (x: Date, withYear: boolean) =>
      x.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
    return `${fmt(d[0].date, false)} – ${fmt(d[6].date, true)}`;
  });

  weekLessons = computed(() => {
    const keys = new Set(this.days().map(d => d.key));
    return this.filtered().filter(l => keys.has(l.slot_date));
  });

  // visible hour range grows if a lesson falls outside 08:00–18:00
  startHour = computed(() => {
    const hs = this.weekLessons().map(l => Number(l.slot_time.split(':')[0]));
    return Math.min(8, ...hs);
  });
  endHour = computed(() => {
    const ends = this.weekLessons().map(l =>
      Math.ceil(Number(l.slot_time.split(':')[0]) + Number(l.slot_time.split(':')[1]) / 60 + Number(l.duration_hours)));
    return Math.max(18, ...ends);
  });
  hours = computed(() => Array.from({ length: this.endHour() - this.startHour() }, (_, i) => this.startHour() + i));
  bodyHeight = computed(() => this.hours().length * ROW);

  lessonsOn(key: string) { return this.weekLessons().filter(l => l.slot_date === key); }

  blockStyle(l: Lesson) {
    const [h, m] = l.slot_time.split(':').map(Number);
    return {
      top: `${(h + m / 60 - this.startHour()) * ROW + 2}px`,
      height: `${Math.max(34, Number(l.duration_hours) * ROW - 4)}px`,
    };
  }

  shiftWeek(delta: number) {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + delta * 7);
    this.weekStart.set(d);
  }
  goToday() { this.weekStart.set(mondayOf(new Date())); }

  // ---------- summaries ----------
  completedCount = computed(() => this.weekLessons().filter(l => lessonStatus(l) === 'completed').length);
  upcomingCount = computed(() => this.weekLessons().filter(l => lessonStatus(l) === 'upcoming').length);

  completedToday = computed(() => {
    const today = ymd(new Date());
    return this.lessons().filter(l => l.slot_date === today && lessonStatus(l) === 'completed');
  });
  nextLessons = computed(() =>
    this.lessons()
      .filter(l => lessonStatus(l) === 'upcoming')
      .sort((a, b) => +lessonStart(a) - +lessonStart(b))
      .slice(0, 3)
  );

  studentName(l: Lesson) {
    return l.student_first_name ? `${l.student_first_name} ${l.student_last_name}` : '';
  }
  instructorName(l: Lesson) {
    return l.instructor_first_name ? `${l.instructor_first_name} ${l.instructor_last_name}` : 'School class';
  }

  // ---------- schedule a lesson ----------
  openForm(date = '', time = '') {
    this.formMessage.set('');
    this.newType.set('theory');
    this.newDate = date;
    this.newTime = time;
    this.newDuration = 1.5;
    this.newInstructor = null;
    this.newRepeat = 1;
    this.newNote = '';
    this.showForm.set(true);
  }
  closeForm() { this.showForm.set(false); }

  // click an empty spot in a day column -> form opens with that day and hour
  onDayClick(ev: MouseEvent, key: string) {
    if (ev.target !== ev.currentTarget) return;        // clicked a lesson, not the empty grid
    if (key < this.todayKey) return;                   // can't schedule in the past
    const hour = this.startHour() + Math.floor(ev.offsetY / ROW);
    this.openForm(key, `${String(hour).padStart(2, '0')}:00`);
  }

  addLesson() {
    if (!this.newDate || !this.newTime) { this.formMessage.set('Please choose a date and a start time.'); return; }
    if (this.newType() === 'practical' && !this.newInstructor) { this.formMessage.set('Please choose an instructor.'); return; }

    this.saving.set(true);
    this.formMessage.set('');
    this.adminService.createLessonSlots({
      slotDate: this.newDate,
      slotTime: this.newTime,
      slotType: this.newType(),
      instructorId: this.newType() === 'practical' ? this.newInstructor : null,
      durationHours: Number(this.newDuration),
      note: this.newNote,
      repeatWeeks: Number(this.newRepeat),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        // jump to the week of the new lesson so the admin sees it right away
        const [y, m, d] = this.newDate.split('-').map(Number);
        this.weekStart.set(mondayOf(new Date(y, m - 1, d)));
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formMessage.set(err.error?.message || 'Failed to schedule the lesson.');
      },
    });
  }
}