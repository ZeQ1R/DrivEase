import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AdminRegistration, AdminSchoolService } from '../../admin-school.service';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';


type Tab = 'all' | 'pending' | 'active' | 'completed'
 
@Component({
  selector: 'app-students',
  imports: [RouterLink,DecimalPipe,DatePipe],
  templateUrl: './students.html',
  styleUrl: './students.css',
})
export class Students implements OnInit{
  private adminService = inject(AdminSchoolService)

  registrations = signal<AdminRegistration[]>([])
  activeTab = signal<Tab>('all')
  search = signal('')
  instructorFilter = signal('')
  expandedId = signal<number | null>(null)

  setTab(tab: Tab) {
    this.activeTab.set(tab)
  }
  toggleExpand(id: number){
    this.expandedId.update(v => (v === id ? null : id))
  }

  
  ngOnInit() {
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.registrations.set(res.registrations)
      },
      error : (err) => console.error("Failed to load students", err)
    })  
  }

  theoryDone(r: AdminRegistration){
    return Number(r.theory_completed_hours) >= Number(r.required_theory_hours)
  }

  practicalDone(r: AdminRegistration){
    return Number(r.practical_completed_hours) >= Number(r.required_hours)
  }

  isCompleted(r: AdminRegistration){
    return r.status === 'completed' || (r.status === 'approved' && this.theoryDone(r) && this.practicalDone(r))
  }

  isActive(r: AdminRegistration){
    return r.status === 'approved' && !this.isCompleted(r)
  }

  pendingCount = computed(() => this.registrations().filter(r => r.status === 'pending').length)
  activeCount    = computed(() => this.registrations().filter(r => this.isActive(r)).length);
  completedCount = computed(() => this.registrations().filter(r => this.isCompleted(r)).length);  theoryHours = computed(() => 
    this.registrations().reduce((sum, r) => sum + Number(r.theory_completed_hours || 0), 0)
  )

  instructors = computed(() => {
    const map = new Map<number, string>()
    for (const r of this.registrations()){
      if (r.instructor_id) map.set(r.instructor_id, `${r.instructor_first_name} ${r.instructor_last_name}`)
    }
  return [...map].map(([id, name]) => ({id,name}))
  })

  filtered = computed(() => {
    const tab = this.activeTab()
    const q = this.search().trim().toLowerCase()
    const instr = this.instructorFilter()

    return this.registrations().filter(r => {
      if (tab === 'pending' && r.status !== 'pending') return false;
      if (tab === 'active' && !this.isActive(r)) return false;
      if (tab === 'completed' && !this.isCompleted(r)) return false;
      if (instr && String(r.instructor_id) !== instr) return false;
      if (q && !`${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(q)) return false;
      return true;
    })
  })

  initials(r: AdminRegistration){
    return `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase()
  }

  enrolment(r: AdminRegistration){
    if(r.status === 'pending') return {tag: 'Pending review', cls: 'pending', sub: 'Not enrolled'}
    if(r.status === 'rejected') return {tag: 'Rejected', cls: 'rejected', sub: 'Not enrolled'}
    if(this.isCompleted(r)) return {tag: 'Completed', cls: 'completed', sub: 'Training finished'}
    return {tag: 'Active', cls: 'active', sub: 'Enrolled'}
  }

  progress(r:AdminRegistration) {
    if(r.status !== 'approved' && r.status !== 'completed') return null
    if(!this.theoryDone(r)) {
      const done = Number(r.theory_completed_hours), req = Number(r.required_theory_hours) || 1
      return { label: 'Theory', percent: Math.min(100, (done / req) * 100), text: `${done} / ${req} h` };
    }
      const done = Number(r.practical_completed_hours), req = Number(r.required_hours) || 1
      return { label: 'Practical', percent: Math.min(100, (done / req) * 100), text: `${done} / ${req} h` };

  }
}
