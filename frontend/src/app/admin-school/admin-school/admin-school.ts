import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminRegistration, AdminSchoolService, Instructor } from '../admin-school.service';
import { ScheduleService } from '../../student-platform/student-dashboard/schedule.service';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { LaneDivider } from '../../shared/lane-divider/lane-divider';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-admin-school',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, NavBar, LaneDivider],
  templateUrl: './admin-school.html',
  styleUrl: './admin-school.css',
  animations: [
    trigger('fadeOut', [
      transition(':leave', [
        animate('600ms ease', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ])
  ]
})
export class AdminSchool implements OnInit {
  private adminService = inject(AdminSchoolService);
  private scheduleService = inject(ScheduleService);

  registrations = signal<AdminRegistration[]>([]);
  filter = signal<'all' | 'pending' | 'approved' | 'rejected'>('all');
  schoolName = signal('');
  bookings = signal<any[]>([]);

  // instructors
  instructors = signal<Instructor[]>([]);
  selectedInstructor: { [regId: number]: number } = {};   // regId -> instructorId
  statusMessage = signal('');

  // create-instructor form
  newInstrFirst = '';
  newInstrLast = '';
  newInstrEmail = '';
  newInstrPhone = '';
  instrMessage = signal('');

  // add-slot form
  newSlotType = 'practical';
  newSlotDate = '';
  newSlotTime = '';
  newSlotNote = '';
  slotMessage = signal('');

  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.registrations() : this.registrations().filter(r => r.status === f);
  });

  pendingCount  = computed(() => this.registrations().filter(r => r.status === 'pending').length);
  approvedCount = computed(() => this.registrations().filter(r => r.status === 'approved').length);
  rejectedCount = computed(() => this.registrations().filter(r => r.status === 'rejected').length);

  setFilter(f: any) { this.filter.set(f); }

  ngOnInit() {
    this.loadRegistrations();
    this.loadInstructors();
    this.loadBookings();
  }

  private loadRegistrations() {
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.schoolName.set(res.schoolName);
        this.registrations.set(res.registrations);
      },
      error: (err) => console.error('Failed to load registrations', err),
    });
  }

  private loadInstructors() {
    this.adminService.getInstructors().subscribe({
      next: (res) => this.instructors.set(res.instructors),
      error: (err) => console.error('Failed to load instructors', err),
    });
  }

  private loadBookings() {
    this.scheduleService.getSchoolBookings().subscribe({
      next: (res) => this.bookings.set(res.bookings),
      error: (err) => console.error('Failed to load bookings', err),
    });
  }

  // APPROVE — requires an instructor
  approve(reg: AdminRegistration) {
    const instructorId = this.selectedInstructor[reg.id];
    if (!instructorId) {
      this.statusMessage.set('Please assign an instructor before accepting.');
      return;
    }
    this.statusMessage.set('');
    this.adminService.updateStatus(reg.id, 'approved', instructorId).subscribe({
      next: () => {
        this.registrations.set(
          this.registrations().map(r => r.id === reg.id ? { ...r, status: 'approved' } : r)
        );
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to approve.'),
    });
  }

  // REJECT — no instructor needed
  reject(reg: AdminRegistration) {
    this.adminService.updateStatus(reg.id, 'rejected').subscribe({
      next: () => {
        this.registrations.set(
          this.registrations().map(r => r.id === reg.id ? { ...r, status: 'rejected' } : r)
        );
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to reject.'),
    });
  }

  createInstructor() {
    if (!this.newInstrFirst || !this.newInstrLast || !this.newInstrEmail) {
      this.instrMessage.set('First name, last name and email are required.');
      return;
    }
    this.adminService.createInstructor(
      this.newInstrFirst, this.newInstrLast, this.newInstrEmail, this.newInstrPhone
    ).subscribe({
      next: (res) => {
        this.instrMessage.set(`Instructor created. Login: ${res.login.email} / ${res.login.password}`);
        this.newInstrFirst = ''; this.newInstrLast = ''; this.newInstrEmail = ''; this.newInstrPhone = '';
        this.loadInstructors();
      },
      error: (err) => this.instrMessage.set(err.error?.message || 'Failed to create instructor.'),
    });
  }

  addSlot() {
    if (!this.newSlotDate || !this.newSlotTime) {
      this.slotMessage.set('Please add a date and time.');
      return;
    }
    this.scheduleService.createSlot(this.newSlotDate, this.newSlotTime, this.newSlotNote, this.newSlotType).subscribe({
      next: () => {
        this.slotMessage.set('Slot added.');
        this.newSlotDate = ''; this.newSlotTime = ''; this.newSlotNote = '';
      },
      error: (err) => this.slotMessage.set(err.error?.message || 'Failed to add slot.'),
    });
  }

  markAttended(b: any) {
    this.scheduleService.markAttended(b.id).subscribe({
      next: () => {
        this.bookings.set(this.bookings().map(x => x.id === b.id ? { ...x, attended: true } : x));
        setTimeout(() => {
          this.bookings.set(this.bookings().filter(x => x.id !== b.id));
        }, 3000);
      },
      error: (err) => console.error('Failed to mark attended', err),
    });
  }
}