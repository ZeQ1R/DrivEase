import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { API_URL } from '../api.config';

export interface AppNotification {
  id: number;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  notifications = signal<AppNotification[]>([]);
  unread = signal(0);

  load() {
    this.http.get<{ notifications: AppNotification[]; unread: number }>(`${API_URL}/notifications/me`).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications);
        this.unread.set(res.unread);
      },
      error: () => {},
    });
  }

  markRead(id: number) {
    this.http.patch(`${API_URL}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        this.unread.update((u) => Math.max(0, u - 1));
      },
    });
  }

  markAllRead() {
    this.http.patch(`${API_URL}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, is_read: true })));
        this.unread.set(0);
      },
    });
  }
}
