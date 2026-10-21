import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../../auth/auth.service';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from '../../../shared/notifications/notification.service';
import {NavItem} from '../NavItem.model'

@Component({
  selector: 'app-admin-school-layout',
  imports: [RouterOutlet,RouterLink,RouterLinkActive],
  templateUrl: './admin-school-layout.html',
  styleUrl: './admin-school-layout.css',
})
export class AdminSchoolLayout implements OnInit{
  private auth = inject(AuthService)
  private router = inject(Router)
  private notifications = inject(NotificationService)

  user = this.auth.getCurrentUser()
  unread = this.notifications.unread

  navItems: NavItem[] = [
    {label: 'Overview', path:'overview', icon: 'overview'},
    {label: 'Applications', path:'applications', icon: 'applications'},
    {label: 'Students', path:'students', icon: 'students'},
    {label: 'Schedules', path:'schedules', icon: 'schedules'},
    {label: 'Messages', path:'messages', icon: 'messages'},
    {label: 'Reviews', path:'reviews', icon: 'reviews'},
  ]

  ngOnInit() {
    this.notifications.load()
  }

  get initials(){
    const u = this.user
    return u ? `${u.firstName?.[0] ?? ''}`.toUpperCase(): '?'
  }

  logout(){
    this.auth.logout()
    this.router.navigate(['/login'])
  }
}
