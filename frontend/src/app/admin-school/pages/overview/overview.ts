import { Component, inject, signal,OnInit, computed } from '@angular/core';
import { AdminSchoolService,AdminRegistration, Instructor } from '../../admin-school.service';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-overview',
  imports: [DatePipe,RouterModule],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview implements OnInit{
  private adminService = inject(AdminSchoolService)
  registrations = signal<AdminRegistration[]>([])
  instructors = signal<Instructor[]>([])

  pendingCount  = computed(() => this.registrations().filter(r => r.status === 'pending').length);
  approvedCount = computed(() => this.registrations().filter(r => r.status === 'approved').length);
  rejectedCount = computed(() => this.registrations().filter(r => r.status === 'rejected').length);
  finishedCount = computed(() => this.registrations().filter(r => this.finished(r)).length);

  pendingList = computed(() => this.registrations().filter(r => r.status === 'pending'))
  recent = computed(() => this.registrations().slice(0, 4))

  today = new Date()
  menuOpen = signal(false)


  ngOnInit(){
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.registrations.set(res.registrations)
      },
      error : (err) => console.error("Failed to load registrations", err)
    })

    this.adminService.getInstructors().subscribe({
      next: (res) => {
        this.instructors.set(res.instructors)
      },
      error : (err) => console.error("Failed to load instructors", err)
    })
  }

  theoryDone(reg: AdminRegistration){
    return Number(reg.theory_completed_hours) >= Number(reg.required_theory_hours);
  }

  practicalDone(reg: AdminRegistration){
    return Number(reg.practical_completed_hours) >= Number(reg.required_hours);
  }

  finished(reg: AdminRegistration){
    return reg.status === 'approved' && this.theoryDone(reg) && this.practicalDone(reg);
  }

  initials(reg:AdminRegistration){
    return `${reg.first_name?.[0] ?? ''} ${reg.last_name?.[0] ?? ''}`.toUpperCase()
  }



  donutStyle = computed(() => {
  const total = this.registrations().length;
  if (total === 0) return '#e6e8ec'; 

  const pending = this.pendingCount();
  const enrolled = this.approvedCount();
  const completed = this.finishedCount();
  const rejected = this.rejectedCount();

  const p1 = (pending / total) * 100;
  const p2 = p1 + (enrolled / total) * 100;
  const p3 = p2 + (completed / total) * 100;

  return `conic-gradient(
    #ffc93c 0% ${p1}%,
    #234e8c ${p1}% ${p2}%,
    #1f9d6a ${p2}% ${p3}%,
    #d14b3d ${p3}% 100%
  )`;
});
}
