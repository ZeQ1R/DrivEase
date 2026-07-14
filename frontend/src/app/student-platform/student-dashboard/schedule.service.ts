import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../../shared/api.config';

export interface Slot {
  id: number;
  slot_date: string;
  slot_time: string;
  slot_type: string;
  note: string;
}

export interface Booking {
  id: number;
  slot_date: string;
  slot_time: string;
  note: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private http = inject(HttpClient);

  getAvailableSlots() {
    return this.http.get<{ slots: Slot[] }>(`${API_URL}/slots/available`);
  }

  bookSlot(id: number) {
    return this.http.post<{ message: string }>(`${API_URL}/slots/${id}/book`, {});
  }

  getMyBookings() {
    return this.http.get<{ bookings: Booking[] }>(`${API_URL}/bookings/me`);
  }

  cancelBooking(id: number) {
    return this.http.delete<{ message: string }>(`${API_URL}/bookings/${id}`);
  }

  getMyHours() {
    return this.http.get<{ completed: number; required: number }>(`${API_URL}/hours/me`);
  }
}
