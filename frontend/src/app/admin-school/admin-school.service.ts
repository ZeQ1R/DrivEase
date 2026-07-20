import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../shared/api.config';
import { Instructor } from '../instructor-platform/instructor.model';

export type { Instructor } from '../instructor-platform/instructor.model';

export interface AdminRegistration {
  id: number;
  status: string;
  registered_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  embg: string;
  date_of_birth: string;
  id_document_url: string | null;
  licenseCategory: string;
  instructor_id: number | null;
  required_theory_hours: number;
  theory_completed_hours: number;
  instructor_first_name: string | null;
  instructor_last_name: string | null;
  medical_done: boolean;
  first_aid_done: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminSchoolService {
  private http = inject(HttpClient);

  getRegistrations() {
    return this.http.get<{ schoolName: string; registrations: AdminRegistration[] }>(
      `${API_URL}/admin/registrations`
    );
  }

  getDocument(documentUrl: string) {
    const file = documentUrl.split('/').pop();
    return this.http.get(`${API_URL}/documents/${file}`, { responseType: 'blob' });
  }

  getInstructors() {
    return this.http.get<{ instructors: Instructor[] }>(`${API_URL}/admin/instructors`);
  }

  updateStatus(id: number, status: 'approved' | 'rejected') {
    return this.http.patch<{ registration: any }>(
      `${API_URL}/admin/registrations/${id}/status`,
      { status }
    );
  }

  assignInstructor(id: number, instructorId: number) {
    return this.http.patch<{ registration: any }>(
      `${API_URL}/admin/registrations/${id}/instructor`,
      { instructorId }
    );
  }

  createTheorySlot(slotDate: string, slotTime: string, note: string, durationHours: number) {
    return this.http.post<{ slot: any }>(
      `${API_URL}/admin/slots`,
      { slotDate, slotTime, note, durationHours }
    );
  }

  createInstructor(firstName: string, lastName: string, email: string, phone: string) {
    return this.http.post<{ instructor: Instructor; login: { email: string; password: string } }>(
      `${API_URL}/admin/instructors`,
      { firstName, lastName, email, phone }
    );
  }

  updateInstructor(id: number, firstName: string, lastName: string, email: string, phone: string) {
    return this.http.put<{ instructor: Instructor }>(
      `${API_URL}/admin/instructors/${id}`,
      { firstName, lastName, email, phone }
    );
  }

  deleteInstructor(id: number) {
    return this.http.delete<{ message: string }>(`${API_URL}/admin/instructors/${id}`);
  }

  updateRegistration(id: number, data: Partial<AdminRegistration> & { postalCode?: string; licenseCategory?: string }) {
    return this.http.put<{ details: any }>(`${API_URL}/admin/registrations/${id}`, data);
  }

  deleteRegistration(id: number) {
    return this.http.delete<{ message: string }>(`${API_URL}/admin/registrations/${id}`);
  }
}
