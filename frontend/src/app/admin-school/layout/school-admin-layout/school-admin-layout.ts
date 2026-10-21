import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { NotificationService } from '../../../shared/notifications/notification.service';

interface NavItem {
  label: string;
  path: string;
  icon: 'overview' | 'applications' | 'students' | 'schedules' | 'messages' | 'reviews';
}

@Component({
  selector: 'app-school-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './school-admin-layout.html',
  styleUrl: './school-admin-layout.css',
})
export class SchoolAdminLayout implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notifications = inject(NotificationService);

  user = this.auth.getCurrentUser();
  unread = this.notifications.unread;

  navItems: NavItem[] = [
    { label: 'Overview', path: 'overview', icon: 'overview' },
    { label: 'Applications', path: 'applications', icon: 'applications' },
    { label: 'Students', path: 'students', icon: 'students' },
    { label: 'Schedules', path: 'schedules', icon: 'schedules' },
    { label: 'Messages', path: 'messages', icon: 'messages' },
    { label: 'Reviews', path: 'reviews', icon: 'reviews' },
  ];

  ngOnInit() {
    this.notifications.load();
  }

  get initials() {
    const u = this.user;
    return u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() : '?';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
