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
  id_document_url: string | null
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

    updateStatus(id: number, status: 'approved' | 'rejected'){
        return this.http.patch<{registration: {id: number; status: string}}>(`${this.apiUrl}/admin/registrations/${id}/status`, {status})
    }

}