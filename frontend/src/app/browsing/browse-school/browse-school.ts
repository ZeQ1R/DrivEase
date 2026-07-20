import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService, AuthUser } from '../../auth/auth.service';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { StarRating } from '../../shared/star-rating/star-rating';
import { LaneDivider } from '../../shared/lane-divider/lane-divider';
import { SchoolsService } from '../../schools/schools.service';
import { Registration, RegistrationService } from '../../auth/registration.service';
import { School } from '../../schools/school.model';
import { LoadingScreen } from '../../shared/loading-screen/loading-screen/loading-screen';
import { ConfirmBox } from '../../shared/confirm-box/confirm-box';

@Component({
  selector: 'app-browse-school',
  standalone: true,
  imports: [CommonModule, RouterLink, NavBar, StarRating, LaneDivider, LoadingScreen, ConfirmBox],
  templateUrl: './browse-school.html',
  styleUrl: './browse-school.css',
})
export class BrowseSchool implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private schoolsService = inject(SchoolsService);
  private registrationService = inject(RegistrationService);
  private authService = inject(AuthService);

  school = signal<School | null>(null);
  registration = signal<Registration | null>(null);
  user: AuthUser | null = null;
  submitting = signal(false)
  confirmOpen = signal(false)

  openRegisterConfirm() { this.confirmOpen.set(true); }
  cancelRegister() { this.confirmOpen.set(false); }
  confirmRegister() {
    this.confirmOpen.set(false);
    const id = this.school()?.id;
    if (id != null) this.router.navigate(['/register-school', id]);
  }

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.submitting.set(true)

    this.schoolsService.getSchoolById(id).subscribe({
      next: (school) => {
        this.school.set(school)
        this.submitting.set(false)
      },
      error: (err) => {
        console.error('Failed to load school', err)
        this.submitting.set(false)
      },
    });

    if (this.user) {
      this.registrationService.getMyRegistration().subscribe({
        next: (res) => this.registration.set(res.registration),
        error: (err) => console.error('Failed to load registration', err),
      });
    }
  }

  private get hasActiveReg() {
    const status = this.registration()?.status;
    return status === 'pending' || status === 'approved';
  }
  get isTheirSchool() { return this.hasActiveReg && this.registration()?.school_id === this.school()?.id; }
  get hasOtherReg() { return this.hasActiveReg && this.registration()!.school_id !== this.school()?.id; }
  get imageUrl() { return this.school() ? `http://localhost:3000/${this.school()!.image.src}` : ''; }
}