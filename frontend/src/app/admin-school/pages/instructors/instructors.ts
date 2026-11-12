import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminRegistration, AdminSchoolService, Instructor } from '../../admin-school.service';

@Component({
  selector: 'app-instructors',
  imports: [],
  templateUrl: './instructors.html',
  styleUrl: './instructors.css',
})
export class Instructors implements OnInit{

  private adminService = inject(AdminSchoolService)

  instructors = signal<Instructor[]>([])

  ngOnInit() {
    this.adminService.getInstructors().subscribe({
      next: (res) => {
        this.instructors.set(res.instructors)
      },
      error: (err) => console.error('Failed to load instructors', err)
    })
  }
}
