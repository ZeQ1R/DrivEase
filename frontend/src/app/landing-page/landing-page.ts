import { Component, HostListener, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SchoolsService } from '../schools/schools.service';
import { School } from '../schools/school.model';
import { AuthService, AuthUser } from '../auth/auth.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage implements OnInit {
  private schoolsService = inject(SchoolsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  user: AuthUser | null = this.authService.getCurrentUser();

  allSchools = signal<School[]>([]);
  featuredSchools = computed(() => this.allSchools().filter(s => Number(s.rating) >= 4.5).slice(0, 3));
  cities = computed(() => [...new Set(this.allSchools().map(s => s.city))].sort());

  stats = signal({ schools: 0, users: 0, students: 0, instructors: 0, lessons: 0, reviews: 0 });

  // header
  scrolled = signal(false);
  menuOpen = signal(false);

  // search card
  city = '';
  transmission = '';

  readonly year = new Date().getFullYear();

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 8); }

  ngOnInit() {
    this.schoolsService.getSchools().subscribe({
      next: (res) => this.allSchools.set(res.schools),
      error: (err) => console.error('Failed to load schools', err),
    });

    this.schoolsService.getStats().subscribe({
      next: (res) => this.countUp(res),
      error: (err) => console.error('Failed to load stats', err),
    });
  }

  get dashboardLink(): string {
    const role = this.user?.role;
    if (role === 'school_admin') return '/school-admin-dashboard';
    if (role === 'platform_admin') return '/platform-admin-dashboard';
    if (role === 'instructor') return '/instructor';
    return '/student-platform-dashboard';
  }

  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }

  logout() {
    this.authService.logout();
    this.user = null;
    this.closeMenu();
    this.router.navigate(['/']);
  }

  go(id: string, ev: Event) {
    ev.preventDefault();
    this.closeMenu();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onSearch() {
    const queryParams: Record<string, string> = {};
    if (this.city.trim()) queryParams['city'] = this.city.trim();
    if (this.transmission) queryParams['transmission'] = this.transmission;
    this.router.navigate(['/browse'], { queryParams });
  }

  schoolInitial(s: School) { return (s.name[0] ?? '?').toUpperCase(); }

  private countUp(target: { schools: number; users: number; students: number; instructors: number; lessons: number; reviews: number }) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { this.stats.set(target); return; }

    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      this.stats.set({
        schools: Math.round(target.schools * eased),
        users: Math.round(target.users * eased),
        students: Math.round(target.students * eased),
        instructors: Math.round(target.instructors * eased),
        lessons: Math.round(target.lessons * eased),
        reviews: Math.round(target.reviews * eased),
      });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}