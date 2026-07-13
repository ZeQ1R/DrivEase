import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Registration {
  id: number;
  status: string;
  registered_at: string;
  school_id: number;
  school_name: string;
  city: string;
  instructor_first_name: string | null;
  instructor_last_name: string | null;
}

@Injectable({ 
  providedIn: 'root' 
})


export class RegistrationService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';

  registerToSchool(data: FormData) {
    return this.http.post<{ message: string; registrationId: number }>(
      `${this.apiUrl}/register-school`, data
    );
  }

  getMyRegistration() {
    return this.http.get<{ registration: Registration | null }>(`${this.apiUrl}/registrations/me`);
  }
}