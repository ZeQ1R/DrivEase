import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, AuthUser } from '../../auth/auth.service';
import { RegistrationService, Registration } from '../../auth/registration.service';
import { LaneDivider } from '../../shared/lane-divider/lane-divider';
import { ProgressTrack } from '../../shared/progress-track/progress-track';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { Booking, ScheduleService, Slot } from './schedule.service';
import { DatePipe } from '@angular/common';
import { ConfirmBox } from '../../shared/confirm-box/confirm-box';
import { ReviewBox } from '../../shared/review-box/review-box';
import { ToastService } from '../../shared/toast/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink, LaneDivider, ProgressTrack, NavBar, DatePipe, ConfirmBox, ReviewBox],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
  animations: [
    trigger('fadeOut', [
      transition(':leave', [
        animate('600ms ease', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ])
  ]
})
export class StudentDashboard implements OnInit {
  private authService = inject(AuthService);
  private registrationService = inject(RegistrationService);
  private scheduleService = inject(ScheduleService)
  private toast = inject(ToastService);

  slots = signal<Slot[]>([])
  bookings = signal<Booking[]>([])

  hours = signal<{completed: number; required:number}>({completed: 0, required: 40.5})
  theory = signal<{completed: number; required:number}>({completed: 0, required: 21})
  phase = signal<'none' | 'theory' | 'awaiting-instructor' | 'practical'>('none')

  hoursPercent = computed(() => {
    const h = this.hours()
    return h.required > 0 ? Math.min(100, (h.completed / h.required) * 100) : 0
  })
  theoryPercent = computed(() => {
    const t = this.theory()
    return t.required > 0 ? Math.min(100, (t.completed / t.required) * 100) : 0
  })
  readyForTest = computed(() => {
    const h = this.hours()
    return this.phase() === 'practical'  && h.completed >= h.required
  })

  user: AuthUser | null = null;
  registration = signal<Registration | null>(null);

  displayStatus = computed(() => {
    const r = this.registration();
    if (!r) return '';
    return r.status === 'approved' ? 'enrolled' : r.status;
  });

  confirmMessage = signal('');
  private pendingAction: (() => void) | null = null;

  askConfirm(message: string, action: () => void) {
    this.confirmMessage.set(message);
    this.pendingAction = action;
  }

  onConfirmYes() {
    const action = this.pendingAction;
    this.confirmMessage.set('');
    this.pendingAction = null;
    action?.();
  }

  onConfirmNo() {
    this.confirmMessage.set('');
    this.pendingAction = null;
  }

  loadingReg = signal(true);

  ngOnInit() {
    this.user = this.authService.getCurrentUser();

    this.registrationService.getMyRegistration().subscribe({
      next: (res) => {
        this.registration.set(res.registration);
        this.loadingReg.set(false);
          if (res.registration?.status === 'approved') {
          this.loadSchedule();
        }

      },
      error: (err) => {
        this.loadingReg.set(false);
        console.error('Failed to load registration', err);
      },
    });
}

private loadSchedule() {
  this.scheduleService.getAvailableSlots().subscribe({
    next: (res) => this.slots.set(res.slots),
    error: (err) => console.error('Failed to load slots', err),
  });
  this.scheduleService.getMyBookings().subscribe({
    next: (res) => this.bookings.set(res.bookings),
    error: (err) => console.error('Failed to load bookings', err),
  });
  this.scheduleService.getMyHours().subscribe({
    next: (res) => {
      this.hours.set({ completed: res.completed, required: res.required });
      this.theory.set(res.theory);
      this.phase.set(res.phase);
    }
  })
}

  bookSlot(slot: Slot){
    this.scheduleService.bookSlot(slot.id).subscribe({
    next: () => {
      this.toast.success('Lesson booked!');
      this.loadSchedule();
    },
    error: (err) => {
      this.toast.error(err.error?.message || 'Booking failed. Please try again.');
      this.loadSchedule();
    },
  });
}

  cancelBooking(b: Booking){
    this.scheduleService.cancelBooking(b.id).subscribe({
      next: () => this.loadSchedule(),
      error: (err) => console.error('Cancel failed', err),
    });
  }

  toggleMedical() {
    const current = !!this.registration()?.medical_done;
    this.registrationService.updateChecklist({ medicalDone: !current }).subscribe({
      next: (res) => this.patchRegistration({ medical_done: res.checklist.medical_done }),
      error: (err) => console.error('Failed to update medical status', err),
    });
  }

  toggleFirstAid() {
    const current = !!this.registration()?.first_aid_done;
    this.registrationService.updateChecklist({ firstAidDone: !current }).subscribe({
      next: (res) => this.patchRegistration({ first_aid_done: res.checklist.first_aid_done }),
      error: (err) => console.error('Failed to update first-aid status', err),
    });
  }

  private patchRegistration(patch: Partial<Registration>) {
    const reg = this.registration();
    if (reg) this.registration.set({ ...reg, ...patch });
  }
}