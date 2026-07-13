import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";


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
  licenseCategory: string
}

export interface Instructor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}


@Injectable({
    providedIn: 'root'
}) 
export class AdminSchoolService {

    private http = inject(HttpClient)
    private apiUrl = 'http://localhost:3000'

    getRegistrations(){
        return this.http.get<{schoolName: string;registrations: AdminRegistration[]}>(`${this.apiUrl}/admin/registrations`)
    }

    getInstructors() {
  return this.http.get<{ instructors: Instructor[] }>(`${this.apiUrl}/admin/instructors`);
    }

    updateStatus(id: number, status: 'approved' | 'rejected', instructorId?: number) {
    return this.http.patch<{ registration: any }>(
        `${this.apiUrl}/admin/registrations/${id}/status`,
        { status, instructorId }
    );
    }

    createInstructor(firstName: string, lastName: string, email: string, phone: string) {
    return this.http.post<{ instructor: Instructor; login: { email: string; password: string } }>(
        `${this.apiUrl}/admin/instructors`,
        { firstName, lastName, email, phone }
    );
    }

    updateInstructor(id: number, firstName: string, lastName: string, email: string, phone: string) {
    return this.http.put<{ instructor: Instructor }>(
        `${this.apiUrl}/admin/instructors/${id}`,
        { firstName, lastName, email, phone }
    );
    }

    deleteInstructor(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/instructors/${id}`);
    }

    updateRegistration(id: number, data: Partial<AdminRegistration> & { postalCode?: string; licenseCategory?: string }) {
    return this.http.put<{ details: any }>(`${this.apiUrl}/admin/registrations/${id}`, data);
    }

    deleteRegistration(id: number) {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/registrations/${id}`);
    }

}