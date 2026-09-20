import { Component, inject, OnInit, ViewEncapsulation,signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SchoolsService } from '../schools/schools.service';
import { School } from '../schools/school.model';
import { LaneDivider } from '../shared/lane-divider/lane-divider';
import { SchoolCard } from '../shared/school-card/school-card';
import { NavBar } from '../shared/nav-bar/nav-bar';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterModule,LaneDivider,SchoolCard,NavBar],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  encapsulation: ViewEncapsulation.None,
})
export class LandingPage implements OnInit{
  private schoolsService = inject(SchoolsService)
  featuredSchools= signal<School[]>([])

  stats = signal({schools: 0, users: 0 ,students: 0, instructors: 0 ,lessons: 0, reviews: 0})

  ngOnInit() {
    this.schoolsService.getSchools().subscribe({
      next: (res) => {
        const filtered = res.schools.filter((s) => Number(s.rating) >= 4.5).slice(0,3)
        this.featuredSchools.set(filtered)
      },
      error: (err) => console.error('Failed to load schools ', err)
    })

    this.schoolsService.getStats().subscribe({
      next: (res) => this.countUp(res),
      error: (err) => console.error('Failed to load stats', err)
    })
}

  private countUp(target: {schools: number; users: number; students: number; instructors: number;lessons: number;reviews: number}){
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {this.stats.set(target); return}

    const duration = 1200
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      this.stats.set({
        schools: Math.round(target.schools * eased),
        users: Math.round(target.users * eased),
        students: Math.round(target.students * eased),
        instructors: Math.round(target.instructors * eased),
        lessons: Math.round(target.lessons * eased),
        reviews: Math.round(target.reviews * eased)
      })
      if(p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
}
