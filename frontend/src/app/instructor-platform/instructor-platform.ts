import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavBar } from '../shared/nav-bar/nav-bar';
import { LaneDivider } from '../shared/lane-divider/lane-divider';
import { InstructorService } from './instructor.service';
import { AuthService, AuthUser } from '../auth/auth.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-instructor-platform',
  imports: [NavBar,LaneDivider,DatePipe,FormsModule],
  templateUrl: './instructor-platform.html',
  styleUrl: './instructor-platform.css',
    animations: [
    trigger('fadeOut', [
      transition(':leave', [
        animate('600ms ease', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ])
  ]
})
export class InstructorPlatform implements OnInit, OnDestroy {

  private instructorService = inject(InstructorService)
  private authService = inject(AuthService)

  private pollId: ReturnType<typeof setInterval> | null = null

  user: AuthUser | null = null

  newSlotType = 'practical'
  newSlotDate = ''
  newSlotTime = ''
  newSlotNote = ''
  newSlotMessage = signal('')

  today = new Date().toISOString().split('T')[0]

  bookings = signal<any[]>([])
  students = signal<any[]>([])

  visibleStudents = computed(() =>
    this.students().filter(s => Number(s.completed_hours) < Number(s.required_hours ?? 40.5))
  )

  upcomingCount = computed(() => this.bookings().length)
  studentCount = computed(() => this.visibleStudents().length)


  ngOnInit() {
    this.user = this.authService.getCurrentUser()
    this.refresh()
    this.pollId = setInterval(() => this.refresh(), 10000)
  }

  ngOnDestroy() {
    if (this.pollId) clearInterval(this.pollId)
  }

  @HostListener('window:focus')
  refresh() {
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
          this.bookings().map(x => x.id === b.id ? {...x,attended: true}: x)
        )
        this.loadStudents()

        setTimeout(() => {
          this.bookings.set(this.bookings().filter(x => x.id !== b.id))
        },2000)
      },
      error: (err) => console.error('Failed to mark attended', err)
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

  progress(completedHours: number, requiredHours = 40.5){
    const required = Number(requiredHours) || 40.5
    return Math.min(100, (Number(completedHours) / required) * 100)
  }
}


