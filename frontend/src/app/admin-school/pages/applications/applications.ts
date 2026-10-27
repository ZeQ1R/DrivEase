import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminRegistration, AdminSchoolService } from '../../admin-school.service';
import { FormsModule } from '@angular/forms';
import { ConfirmBox } from '../../../shared/confirm-box/confirm-box';

@Component({
  selector: 'app-applications',
  imports: [FormsModule, ConfirmBox],
  templateUrl: './applications.html',
  styleUrl: './applications.css',
})
export class Applications implements OnInit{

  private adminService = inject(AdminSchoolService)

  registrations = signal<AdminRegistration[]>([])
  schoolName = signal('')
  message = signal('')

  editingId = signal<number | null>(null)
  editForm = {firstName: '', lastName: '', email: '',phone: '',address: '', postalCode: '', embg: '',licenseCategory: ''}

  confirmTarget = signal<AdminRegistration | null>(null)

  ngOnInit() {
    this.adminService.getRegistrations().subscribe({
      next: (res) => {
        this.schoolName.set(res.schoolName)
        this.registrations.set(res.registrations)
      },
      error: (err) => console.error("Failed to load registrations", err)
    })
  }

  setStatus(reg: AdminRegistration, status: 'approved' | 'rejected'){
    this.message.set('')
    this.adminService.updateStatus(reg.id,status).subscribe({
      next: () => {
        this.registrations.update(list => 
          list.map(r => r.id === reg.id ? {...r, status, instructor_id: status === 'rejected' ? null : r.instructor_id} : r)
        )
      },
      error : (err) => this.message.set(err.error?.message || `Failed to ${status === 'approved' ? 'accept' : 'reject'}`),
    })
  }

  startEdit(reg: AdminRegistration){
    this.editingId.set(reg.id)
    this.editForm = {
      firstName: reg.first_name, lastName: reg.last_name, email: reg.email,
      phone: reg.phone || '', address: reg.address || '', postalCode: reg.postal_code || '',
      embg: reg.embg || '', licenseCategory: reg.licenseCategory || '',
    }
  }

  cancelEdit(reg: AdminRegistration){
    this.editingId.set(null)
  }

  saveEdit(id: number){
    const e = this.editForm
    if(!e.firstName || !e.lastName || !e.email){
      this.message.set('First name, last name and email are required')
      return
    }

    this.adminService.updateRegistration(id, e).subscribe({
      next: () => {
        this.registrations.update(list => list.map(r => r.id === id ? {
          ...r,
          first_name: e.firstName, last_name: e.lastName, email: e.email, phone: e.phone,
          address: e.address, postal_code: e.postalCode, embg:e.embg,licenseCategory: e.licenseCategory
        }: r))
        this.editingId.set(null)
        this.message.set('Application updated.')
      },
      error: (err) => this.message.set(err.error?.message || 'Failed to update application.')
    })
  }

  askDelete(reg:AdminRegistration){
    this.confirmTarget.set(reg)
  }

  confirmDelete(){
    const reg = this.confirmTarget()
    this.confirmTarget.set(null)
    if(!reg) return
    this.adminService.deleteRegistration(reg.id).subscribe({
      next: () => {
        this.registrations.update(list => list.filter(r => r.id !== reg.id))
        this.message.set('Application deleted')
      },
      error: (err) => this.message.set(err.error?.message || 'Failed to delete application')
    })
  }

  cancelDelete() {
    this.confirmTarget.set(null)
  }
}
