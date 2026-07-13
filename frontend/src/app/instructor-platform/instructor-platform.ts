import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavBar } from '../shared/nav-bar/nav-bar';
import { LaneDivider } from '../shared/lane-divider/lane-divider';
import { InstructorService } from './instructor.service';
import { RegistrationService } from '../auth/registration.service';
import { AuthService, AuthUser } from '../auth/auth.service';
import { retry } from 'rxjs';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-instructor-platform',
  imports: [NavBar,LaneDivider,DatePipe,FormsModule],
  templateUrl: './instructor-platform.html',
  styleUrl: './instructor-platform.css',
})
export class InstructorPlatform implements OnInit{

  private instructorService = inject(InstructorService)
  private authService = inject(AuthService)

  user: AuthUser | null = null

  newSlotType = 'practical'
  newSlotDate = ''
  newSlotTime = ''
  newSlotNote = ''
  newSlotMessage = signal('')

  bookings = signal<any[]>([])
  students = signal<any[]>([])

  upcomingCount = computed(() => this.bookings().length)
  studentCount = computed(() => this.students().length)


  ngOnInit() {
    this.authService.getCurrentUser()
    this.loadBookings()
    this.loadStudents()
  }

  private loadBookings(){
    this.instructorService.getMyBookings().subscribe({
      next: (res) =>{
        this.bookings.set(res.bookings)
      },
      error: (err) => console.error('Failed to load bookings', err)
    })
  }

  private loadStudents(){
    this.instructorService.getMyStudents().subscribe({
      next: (res) => {
        this.students.set(res.students)
      },
      error: (err) => console.error('Failed to load students', err)
    })
  }

  markAttended(b: any){
    this.instructorService.markAttended(b.id).subscribe({
      next: () => {
        this.bookings.set(
          this.bookings().map(x => x.id === b.id ? {...x,attented: true}: x)
        )
        this.loadStudents()

        setTimeout(() => {
          this.bookings.set(this.bookings().filter(x => x.id !== b.id))
        },2000)
      },
      error: (err) => console.error('Failed to mark attented', err)
    })
  }

  addSlot(){
    if(!this.newSlotDate || !this.newSlotTime){
      this.newSlotMessage.set('Please add a date and a time.')
      return
    }

    this.instructorService.createSlot(
      this.newSlotDate,
      this.newSlotTime,
      this.newSlotNote,
      this.newSlotType
    ).subscribe({
      next: () => {
        this.newSlotMessage.set('Slot added. Students can now book it. ')
        this.newSlotDate = ''
        this.newSlotTime = ''
        this.newSlotNote = ''
      },
      error: (err) => this.newSlotMessage.set(err.error?.message || 'Failed to add slot.')
    })
  }

  progress(completedHours: number){
    return Math.min(100, (completedHours / 40) * 100)
  }
}


