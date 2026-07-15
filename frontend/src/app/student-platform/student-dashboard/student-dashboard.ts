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

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink, LaneDivider, ProgressTrack, NavBar, DatePipe, ConfirmBox],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.css',
})
export class StudentDashboard implements OnInit {
  private authService = inject(AuthService);
  private registrationService = inject(RegistrationService);
  private scheduleService = inject(ScheduleService)

  slots = signal<Slot[]>([])
  bookings = signal<Booking[]>([])



  hours = signal<{completed: number; required:number}>({completed: 0, required: 40})
  hoursPercent = computed(() => {
    const h = this.hours()
    return h.required > 0 ? Math.min(100, (h.completed / h.required) * 100) : 0
  })
  readyForTest = computed(() => {
    const h = this.hours()
    return h.required > 0 && h.completed >= h.required
  })

  user: AuthUser | null = null;
  registration = signal<Registration | null>(null);

  // an approved application means the student is now enrolled
  displayStatus = computed(() => {
    const r = this.registration();
    if (!r) return '';
    return r.status === 'approved' ? 'enrolled' : r.status;
  });

  // shared confirm box
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

  ngOnInit() {
    this.user = this.authService.getCurrentUser();

    this.registrationService.getMyRegistration().subscribe({
      next: (res) => {
        this.registration.set(res.registration);
          if (res.registration?.status === 'approved') {
          this.loadSchedule();
        }
  
      },
      error: (err) => console.error('Failed to load registration', err),
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
    next: (res) => this.hours.set(res)
  })
}

  bookSlot(slot: Slot){
    this.scheduleService.bookSlot(slot.id).subscribe({
    next: () => this.loadSchedule(),
    error: (err) => console.error('Booking failed', err),
  });
}

  cancelBooking(b: Booking){
    this.scheduleService.cancelBooking(b.id).subscribe({
      next: () => this.loadSchedule(),
      error: (err) => console.error('Cancel failed', err),
    });
  }
}