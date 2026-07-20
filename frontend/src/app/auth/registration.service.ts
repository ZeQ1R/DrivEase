import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../shared/api.config';

export interface Registration {
  id: number;
  status: string;
  registered_at: string;
  school_id: number;
  school_name: string;
  city: string;
  instructor_first_name: string | null;
  instructor_last_name: string | null;
  medical_done: boolean;
  first_aid_done: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private http = inject(HttpClient);

  registerToSchool(data: FormData) {
    return this.http.post<{ message: string; registrationId: number }>(
      `${API_URL}/register-school`, data
    );
  }

  getMyRegistration() {
    return this.http.get<{ registration: Registration | null }>(`${API_URL}/registrations/me`);
  }

  updateChecklist(data: { medicalDone?: boolean; firstAidDone?: boolean }) {
    return this.http.patch<{ checklist: { id: number; medical_done: boolean; first_aid_done: boolean } }>(
      `${API_URL}/registrations/me/checklist`, data
    );
  }
}
