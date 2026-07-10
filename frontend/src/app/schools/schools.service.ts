import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { School } from './school.model';

@Injectable({ providedIn: 'root' })
export class SchoolsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000';
  
  getSchools() {
    return this.http.get<{ schools: School[] }>(`${this.apiUrl}/schools`);
  }

  getSchoolById(id: string | number) {
    return this.http.get<{ school: School }>(`${this.apiUrl}/schools/${id}`).pipe(
      map((resData) => resData.school),
      catchError(() => throwError(() => new Error('Unable to load school details.')))
    );
  }

  createSchool(data : FormData){
    return this.http.post(`${this.apiUrl}/admin/schools`, data)
  }

  updateSchool(id:number, data: FormData){
    return this.http.put(`${this.apiUrl}/admin/schools/${id}`, data)
  }

  deleteSchool(id: number){
    return this.http.delete(`${this.apiUrl}/admin/schools/${id}`)
  }
}