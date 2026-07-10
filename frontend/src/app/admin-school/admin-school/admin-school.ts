import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminRegistration, AdminSchoolService } from '../admin-school.service';
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
        animate('600ms ease', style({opacity: 0, transform: 'translateX(20px)'}))
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

  newSlotType = 'practical';
  newSlotDate = '';
  newSlotTime = '';
  newSlotNote = '';
  slotMessage = signal('');

  // bookings / attendance
  bookings = signal<any[]>([]);

  filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.registrations() : this.registrations().filter(r => r.status === f);
  });

  pendingCount  = computed(() => this.registrations().filter(r => r.status === 'pending').length);
  approvedCount = computed(() => this.registrations().filter(r => r.status === 'approved').length);
  rejectedCount = computed(() => this.registrations().filter(r => r.status === 'rejected').length);

  setFilter(f: any) { this.filter.set(f); }

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.schoolName.set(res.schoolName);
        this.registrations.set(res.registrations);
      },
      error: (err) => console.error('Failed to load registrations', err),
    });

    this.scheduleService.getSchoolBookings().subscribe({
      next: (res) => this.bookings.set(res.bookings),
      error: (err) => console.error('Failed to load bookings', err),
    });
  }

  updateStatus(reg: AdminRegistration, status: 'approved' | 'rejected') {
    this.adminService.updateStatus(reg.id, status).subscribe({
      next: () => {
        this.registrations.set(
          this.registrations().map(r => r.id === reg.id ? { ...r, status } : r)
        );
      },
      error: (err) => console.error('Failed to update status', err),
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
        this.newSlotDate = '';
        this.newSlotTime = '';
        this.newSlotNote = '';
      },
      error: (err) => this.slotMessage.set(err.error?.message || 'Failed to add slot.'),
    });
  }

  markAttended(b: any) {
    this.scheduleService.markAttended(b.id).subscribe({
      next: () => {
        this.bookings.set(this.bookings().map(x => x.id === b.id ? { ...x, attended: true } : x));
        setTimeout(() => {
          this.bookings.set(this.bookings().filter(x => x.id !== b.id))
        }, 3000)
      },
      error: (err) => console.error('Failed to mark attended', err),
    });
  }
}