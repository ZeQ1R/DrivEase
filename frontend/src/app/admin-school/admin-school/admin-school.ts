import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminRegistration, AdminSchoolService, Instructor } from '../admin-school.service';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { LaneDivider } from '../../shared/lane-divider/lane-divider';
import { ConfirmBox } from '../../shared/confirm-box/confirm-box';
import { EmptyState } from '../../shared/empty-state/empty-state';

@Component({
  selector: 'app-admin-school',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, NavBar, LaneDivider, ConfirmBox,EmptyState],
  templateUrl: './admin-school.html',
  styleUrl: './admin-school.css',
})
export class AdminSchool implements OnInit {
  private adminService = inject(AdminSchoolService);

  registrations = signal<AdminRegistration[]>([]);
  filter = signal<'all' | 'pending' | 'approved' | 'rejected' | 'finished'>('all');
  schoolName = signal('');
  searchTerm = signal('');

  activeTab = signal<'students' | 'management'>('students');
  setTab(tab: 'students' | 'management') { this.activeTab.set(tab); }

  instructors = signal<Instructor[]>([]);
  selectedInstructor: { [regId: number]: number } = {};
  statusMessage = signal('');

  newInstrFirst = '';
  newInstrLast = '';
  newInstrEmail = '';
  newInstrPhone = '';
  instrMessage = signal('');

  newTheoryDate = '';
  newTheoryTime = '';
  newTheoryDuration = 1.5;
  newTheoryNote = '';
  theoryMessage = signal('');

  today = new Date().toISOString().split('T')[0];

  theoryDone(reg: AdminRegistration) {
    return Number(reg.theory_completed_hours) >= Number(reg.required_theory_hours);
  }

  theoryPercent(reg: AdminRegistration) {
    const req = Number(reg.required_theory_hours) || 1;
    return Math.min(100, (Number(reg.theory_completed_hours) / req) * 100);
  }

  practicalDone(reg: AdminRegistration) {
    return Number(reg.practical_completed_hours) >= Number(reg.required_hours);
  }

  practicalPercent(reg: AdminRegistration) {
    const req = Number(reg.required_hours) || 1;
    return Math.min(100, (Number(reg.practical_completed_hours) / req) * 100);
  }

  finished(reg: AdminRegistration) {
    return reg.status === 'approved' && this.theoryDone(reg) && this.practicalDone(reg);
  }

  editingInstructorId = signal<number | null>(null);
  editInstr = { firstName: '', lastName: '', email: '', phone: '' };

  editingRegId = signal<number | null>(null);
  editReg = { firstName: '', lastName: '', email: '', phone: '', address: '', postalCode: '', embg: '', licenseCategory: '' };

  confirmMessage = signal('');
  confirmText = signal('Yes');
  private pendingAction: (() => void) | null = null;

  askConfirm(message: string, action: () => void, confirmText = 'Yes') {
    this.confirmMessage.set(message);
    this.confirmText.set(confirmText);
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

  filtered = computed(() => {
    const f = this.filter();
    const q = this.searchTerm().trim().toLowerCase();
    let list =
      f === 'all' ? this.registrations()
      : f === 'finished' ? this.registrations().filter(r => this.finished(r))
      : this.registrations().filter(r => r.status === f);
    if (q) {
      list = list.filter(r => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q));
    }
    return list;
  });

  pendingCount  = computed(() => this.registrations().filter(r => r.status === 'pending').length);
  approvedCount = computed(() => this.registrations().filter(r => r.status === 'approved').length);
  rejectedCount = computed(() => this.registrations().filter(r => r.status === 'rejected').length);
  finishedCount = computed(() => this.registrations().filter(r => this.finished(r)).length);

  setFilter(f: any) { this.filter.set(f); }

  ngOnInit() {
    this.loadRegistrations();
    this.loadInstructors();
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

  approve(reg: AdminRegistration) {
    this.statusMessage.set('');
    this.adminService.updateStatus(reg.id, 'approved').subscribe({
      next: () => {
        this.registrations.set(
          this.registrations().map(r => r.id === reg.id ? { ...r, status: 'approved' } : r)
        );
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to approve.'),
    });
  }

  reject(reg: AdminRegistration) {
    this.adminService.updateStatus(reg.id, 'rejected').subscribe({
      next: () => {
        this.registrations.set(
          this.registrations().map(r => r.id === reg.id ? { ...r, status: 'rejected', instructor_id: null } : r)
        );
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to reject.'),
    });
  }

  assignInstructor(reg: AdminRegistration) {
    const instructorId = this.selectedInstructor[reg.id];
    if (!instructorId) {
      this.statusMessage.set('Please choose an instructor to assign.');
      return;
    }
    this.statusMessage.set('');
    this.adminService.assignInstructor(reg.id, instructorId).subscribe({
      next: () => {
        const instr = this.instructors().find(i => i.id === instructorId);
        this.registrations.set(
          this.registrations().map(r => r.id === reg.id ? {
            ...r,
            instructor_id: instructorId,
            instructor_first_name: instr?.first_name ?? null,
            instructor_last_name: instr?.last_name ?? null,
          } : r)
        );
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to assign instructor.'),
    });
  }

  addTheorySlot() {
    if (!this.newTheoryDate || !this.newTheoryTime) {
      this.theoryMessage.set('Please add a date and time.');
      return;
    }
    this.adminService.createTheorySlot(
      this.newTheoryDate, this.newTheoryTime, this.newTheoryNote, Number(this.newTheoryDuration)
    ).subscribe({
      next: () => {
        this.theoryMessage.set('Theory class added. Students can now book it.');
        this.newTheoryDate = ''; this.newTheoryTime = ''; this.newTheoryNote = '';
      },
      error: (err) => this.theoryMessage.set(err.error?.message || 'Failed to add theory class.'),
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

  startEditInstructor(i: Instructor) {
    this.editingInstructorId.set(i.id);
    this.editInstr = { firstName: i.first_name, lastName: i.last_name, email: i.email, phone: i.phone || '' };
  }

  cancelEditInstructor() {
    this.editingInstructorId.set(null);
  }

  saveInstructor(id: number) {
    const { firstName, lastName, email, phone } = this.editInstr;
    if (!firstName || !lastName || !email) {
      this.instrMessage.set('First name, last name and email are required.');
      return;
    }
    this.adminService.updateInstructor(id, firstName, lastName, email, phone).subscribe({
      next: (res) => {
        this.instructors.set(this.instructors().map(i => i.id === id ? res.instructor : i));
        this.editingInstructorId.set(null);
        this.instrMessage.set('Instructor updated.');
      },
      error: (err) => this.instrMessage.set(err.error?.message || 'Failed to update instructor.'),
    });
  }

  deleteInstructor(i: Instructor) {
    this.adminService.deleteInstructor(i.id).subscribe({
      next: () => {
        this.instructors.set(this.instructors().filter(x => x.id !== i.id));
        this.instrMessage.set('Instructor deleted.');
      },
      error: (err) => this.instrMessage.set(err.error?.message || 'Failed to delete instructor.'),
    });
  }

  openDocument(reg: AdminRegistration) {
    if (!reg.id_document_url) return;
    this.adminService.getDocument(reg.id_document_url).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => this.statusMessage.set('Could not open that document.'),
    });
  }

  startEditReg(reg: AdminRegistration) {
    this.editingRegId.set(reg.id);
    this.editReg = {
      firstName: reg.first_name, lastName: reg.last_name, email: reg.email,
      phone: reg.phone || '', address: reg.address || '', postalCode: reg.postal_code || '',
      embg: reg.embg || '', licenseCategory: reg.licenseCategory || '',
    };
  }

  cancelEditReg() {
    this.editingRegId.set(null);
  }

  saveReg(id: number) {
    const e = this.editReg;
    if (!e.firstName || !e.lastName || !e.email) {
      this.statusMessage.set('First name, last name and email are required.');
      return;
    }
    this.adminService.updateRegistration(id, e).subscribe({
      next: () => {
        this.registrations.set(this.registrations().map(r => r.id === id ? {
          ...r,
          first_name: e.firstName, last_name: e.lastName, email: e.email, phone: e.phone,
          address: e.address, postal_code: e.postalCode, embg: e.embg, licenseCategory: e.licenseCategory,
        } : r));
        this.editingRegId.set(null);
        this.statusMessage.set('Application updated.');
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to update application.'),
    });
  }

  deleteReg(reg: AdminRegistration) {
    this.adminService.deleteRegistration(reg.id).subscribe({
      next: () => {
        this.registrations.set(this.registrations().filter(r => r.id !== reg.id));
        this.statusMessage.set('Application deleted.');
      },
      error: (err) => this.statusMessage.set(err.error?.message || 'Failed to delete application.'),
    });
  }
}
