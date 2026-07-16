import { Component, HostListener, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, AuthUser } from '../../auth/auth.service';
import { NotificationService, AppNotification } from '../notifications/notification.service';

@Component({
  selector: 'app-nav-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css',
})
export class NavBar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notifications = inject(NotificationService);
  user: AuthUser | null = null;

  scrolled = signal(false);
  notifOpen = signal(false);

  // expose the service signals to the template
  notifList = this.notifications.notifications;
  unread = this.notifications.unread;

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 8); }

  ngOnInit() {
    this.user = this.authService.getCurrentUser();
    if (this.user) this.notifications.load();
  }

  markAllRead() { this.notifications.markAllRead(); }

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
