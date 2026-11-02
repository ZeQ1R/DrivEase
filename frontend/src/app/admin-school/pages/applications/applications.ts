import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminRegistration, AdminSchoolService } from '../../admin-school.service';

type Tab = 'pending' | 'approved' | 'rejected' | 'all';

@Component({
  selector: 'app-applications',
  imports: [RouterLink, DatePipe, UpperCasePipe],
  templateUrl: './applications.html',
  styleUrl: './applications.css',
})
export class Applications implements OnInit {
  private adminService = inject(AdminSchoolService);
  private router = inject(Router);

  registrations = signal<AdminRegistration[]>([]);
  schoolName = signal('');

  activeTab = signal<Tab>('pending');
  search = signal('');
  course = signal('');
  sort = signal<'newest' | 'oldest'>('newest');

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.schoolName.set(res.schoolName);
        this.registrations.set(res.registrations);
      },
      error: (err) => console.error('Failed to load registrations', err),
    });
  }

  isApproved(r: AdminRegistration) { return r.status === 'approved' || r.status === 'completed'; }

  pendingCount  = computed(() => this.registrations().filter(r => r.status === 'pending').length);
  approvedCount = computed(() => this.registrations().filter(r => this.isApproved(r)).length);
  rejectedCount = computed(() => this.registrations().filter(r => r.status === 'rejected').length);
  totalCount    = computed(() => this.registrations().length);

  courses = computed(() =>
    [...new Set(this.registrations().map(r => r.licenseCategory).filter(Boolean))].sort()
  );

  nextPending = computed(() =>
    this.registrations()
      .filter(r => r.status === 'pending')
      .sort((a, b) => +new Date(a.registered_at) - +new Date(b.registered_at))[0] ?? null
  );

  latest = computed(() =>
    [...this.registrations()].sort((a, b) => +new Date(b.registered_at) - +new Date(a.registered_at))[0] ?? null
  );

  filtered = computed(() => {
    const tab = this.activeTab();
    const q = this.search().trim().toLowerCase();
    const course = this.course();
    const dir = this.sort() === 'newest' ? -1 : 1;

    return this.registrations()
      .filter(r => {
        if (tab === 'pending' && r.status !== 'pending') return false;
        if (tab === 'approved' && !this.isApproved(r)) return false;
        if (tab === 'rejected' && r.status !== 'rejected') return false;
        if (course && r.licenseCategory !== course) return false;
        if (q && !`${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => dir * (+new Date(a.registered_at) - +new Date(b.registered_at)));
  });

  setTab(t: Tab) { this.activeTab.set(t); }

  open(r: AdminRegistration) {
    this.router.navigate(['/school-admin-dashboard/applications', r.id]);
  }

  initials(r: AdminRegistration) {
    return `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase();
  }

  reviewStatus(r: AdminRegistration) {
    if (r.status === 'pending') return { tag: 'Pending review', cls: 'pending', sub: 'Licence verification' };
    if (r.status === 'rejected') return { tag: 'Rejected', cls: 'rejected', sub: 'Not enrolled' };
    return { tag: 'Approved', cls: 'approved', sub: 'Enrolled' };
  }
}