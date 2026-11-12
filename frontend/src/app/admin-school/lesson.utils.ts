import { Lesson } from './admin-school.service';

export type LessonStatus = 'open' | 'upcoming' | 'completed' | 'awaiting';

export const STATUS_LABEL: Record<LessonStatus, string> = {
  open: 'Open slot',
  upcoming: 'Upcoming',
  completed: 'Completed',
  awaiting: 'Awaiting attendance',
};

export function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (x.getDay() + 6) % 7;   // Monday = 0
  x.setDate(x.getDate() - diff);
  return x;
}

export function lessonStart(l: Lesson) {
  const [y, m, d] = l.slot_date.split('-').map(Number);
  const [h, mi] = l.slot_time.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
}

export function lessonEnd(l: Lesson) {
  return new Date(+lessonStart(l) + Number(l.duration_hours) * 3600000);
}

// same rules as the backend: theory counts once it has started, practical needs attendance
export function lessonStatus(l: Lesson): LessonStatus {
  if (!l.booking_id) return 'open';
  if (l.slot_type === 'practical') {
    if (l.attended) return 'completed';
    return lessonEnd(l) < new Date() ? 'awaiting' : 'upcoming';
  }
  return lessonStart(l) < new Date() ? 'completed' : 'upcoming';
}

export function lessonTitle(l: Lesson) {
  return l.note || (l.slot_type === 'theory' ? 'Theory class' : 'Practical driving lesson');
}