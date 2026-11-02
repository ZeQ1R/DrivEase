import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminRegistration, AdminSchoolService } from '../admin-school.service';
import { ConfirmBox } from '../../shared/confirm-box/confirm-box';

@Component({
  selector: 'app-student-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, UpperCasePipe, ConfirmBox],
  templateUrl: './application-detail.html',
  styleUrl: './application-detail.css',
})
export class ApplicationDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminService = inject(AdminSchoolService);

  private id = Number(this.route.snapshot.paramMap.get('id'));

  registrations = signal<AdminRegistration[]>([]);
  schoolName = signal('');
  loading = signal(true);
  tab = signal<'overview' | 'application'>('overview');
  message = signal('');

  // review screen state
  showRecord = signal(false);
  checks = signal([false, false, false]);
  allChecked = computed(() => this.checks().every(Boolean));
  busy = signal(false);
  confirmReject = signal(false);

  student = computed(() => this.registrations().find(r => r.id === this.id) ?? null);

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.schoolName.set(res.schoolName);
        this.registrations.set(res.registrations);
        this.loading.set(false);
      },
      error: (err) => { console.error('Failed to load student', err); this.loading.set(false); },
    });
  }

  initials(r: AdminRegistration) {
    return `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase();
  }

  age(r: AdminRegistration) {
    const d = new Date(r.date_of_birth);
    if (isNaN(+d)) return null;
    const t = new Date();
    let a = t.getFullYear() - d.getFullYear();
    if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--;
    return a;
  }

  theoryDone(r: AdminRegistration) { return Number(r.theory_completed_hours) >= Number(r.required_theory_hours); }
  practicalDone(r: AdminRegistration) { return Number(r.practical_completed_hours) >= Number(r.required_hours); }
  isCompleted(r: AdminRegistration) {
    return r.status === 'completed' || (r.status === 'approved' && this.theoryDone(r) && this.practicalDone(r));
  }

  // pending | active | completed | rejected
  state = computed(() => {
    const r = this.student();
    if (!r) return 'pending';
    if (r.status === 'rejected') return 'rejected';
    if (r.status === 'pending') return 'pending';
    return this.isCompleted(r) ? 'completed' : 'active';
  });

  banner = computed(() => {
    const name = this.student()?.first_name ?? 'This student';
    switch (this.state()) {
      case 'pending':   return { cls: 'pending',   title: 'Application pending · Not actively enrolled', text: `An active enrolment begins only after ${name}'s application and licence review are approved.` };
      case 'active':    return { cls: 'active',    title: 'Actively enrolled', text: `${name} is currently in training.` };
      case 'completed': return { cls: 'completed', title: 'Training completed', text: `${name} has finished all required theory and practical hours.` };
      default:          return { cls: 'rejected',  title: 'Application rejected', text: `${name} is not enrolled at your school.` };
    }
  });

  statusLabel = computed(() => ({ pending: 'Pending review', active: 'Active', completed: 'Completed', rejected: 'Rejected' }[this.state()]));

  theoryPercent = computed(() => this.percent(this.student()?.theory_completed_hours, this.student()?.required_theory_hours));
  practicalPercent = computed(() => this.percent(this.student()?.practical_completed_hours, this.student()?.required_hours));

  private percent(done: unknown, required: unknown) {
    const req = Number(required) || 1;
    return Math.min(100, (Number(done || 0) / req) * 100);
  }

  toggleCheck(i: number) {
    this.checks.update(c => c.map((v, idx) => (idx === i ? !v : v)));
  }

  decide(status: 'approved' | 'rejected') {
    const s = this.student();
    if (!s) return;
    this.busy.set(true);
    this.message.set('');
    this.adminService.updateStatus(s.id, status).subscribe({
      next: () => {
        this.registrations.update(list => list.map(r => (r.id === s.id ? { ...r, status } : r)));
        this.busy.set(false);
        this.confirmReject.set(false);
        if (this.router.url.includes('/applications/')) {
          this.router.navigate(['/school-admin-dashboard/applications']);
        } else {
          this.showRecord.set(false);
        }
      },
      error: (err) => {
        this.message.set(err.error?.message || 'Could not save the decision.');
        this.busy.set(false);
        this.confirmReject.set(false);
      },
    });
  }

  openDocument(r: AdminRegistration) {
    if (!r.id_document_url) return;
    this.adminService.getDocument(r.id_document_url).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => this.message.set('Could not open that document.'),
    });
  }
}