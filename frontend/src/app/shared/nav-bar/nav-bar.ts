import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthUser } from '../../auth/auth.service';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  private authService = inject(AuthService);
  private router = inject(Router);
  user: AuthUser | null = null;

  ngOnInit() { this.user = this.authService.getCurrentUser(); }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  get dashboardLink(): string{  
    const role = this.user?.role
    if(role === 'school_admin') return '/school-admin-dashboard';
    if(role === 'platform_admin') return '/platform-admin-dashboard'
    return '/student-platform-dashboard'
  }
}
