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

  ngOnInit() {
    this.schoolsService.getSchools().subscribe({
      next: (res) => {
        const filtered = res.schools.filter((s) => Number(s.rating) >= 4.5).slice(0,3)
        this.featuredSchools.set(filtered)
      },
      error: (err) => console.error('Failed to load schools ', err)
    })
}
}
