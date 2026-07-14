import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../shared/api.config';

export type { Instructor } from './instructor.model';

export interface InstructorBooking {
  id: number;
  attended: boolean;
  slot_date: string;
  slot_time: string;
  slot_type: string;
  duration_hours: number;
  first_name: string;
  last_name: string;
}

export interface InstructorStudent {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  completed_hours: number;
  required_hours: number;
}

@Injectable({ providedIn: 'root' })
export class InstructorService {
  private http = inject(HttpClient);

  getMyBookings() {
    return this.http.get<{ bookings: InstructorBooking[] }>(`${API_URL}/instructor/bookings`);
  }

  getMyStudents() {
    return this.http.get<{ students: InstructorStudent[] }>(`${API_URL}/instructor/students`);
  }

  markAttended(id: number) {
    return this.http.patch(`${API_URL}/instructor/bookings/${id}/attended`, {});
  }

  createSlot(slotDate: string, slotTime: string, note: string, slotType: string) {
    return this.http.post(`${API_URL}/instructor/slots`, { slotDate, slotTime, note, slotType });
  }
}
