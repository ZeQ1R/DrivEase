import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SchoolsService } from '../../schools/schools.service';
import { School } from '../../schools/school.model';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { SchoolCard } from '../../shared/school-card/school-card';
import { LaneDivider } from '../../shared/lane-divider/lane-divider';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen/loading-screen';

@Component({
  selector: 'app-browsing-schools',
  standalone: true,
  imports: [CommonModule, FormsModule, NavBar, SchoolCard, LaneDivider],
  templateUrl: './browsing-schools.html',
  styleUrl: './browsing-schools.css'
})
export class BrowsingSchools implements OnInit {
  private schoolsService = inject(SchoolsService);

  schools: School[] = [];
  search = '';
  cityFilter = 'All';
  maxPrice = 1000;


  ngOnInit() {


    this.schoolsService.getSchools().subscribe({
      next: (res) => {
        (this.schools = res.schools)
        
      },
      error: (err) => console.error('Failed to load schools', err)
    });
  }

  get cities() {
    return ['All', ...new Set(this.schools.map((s) => s.city))];
  }

  get filtered() {
    return this.schools.filter((s) => {
      if (this.cityFilter !== 'All' && s.city !== this.cityFilter) return false;
      if (Number(s.price) > this.maxPrice) return false;
      if (this.search && !s.name.toLowerCase().includes(this.search.toLowerCase())) return false;
      return true;
    });
  }

  clearFilters() {
    this.cityFilter = 'All';
    this.maxPrice = 1000;
    this.search = '';
  }

  get filtersActive() {
    return this.cityFilter !== 'All' || this.maxPrice < 1000 || !!this.search;
  }
}