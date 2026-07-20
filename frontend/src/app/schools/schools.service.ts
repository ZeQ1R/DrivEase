import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { School } from './school.model';
import { API_URL } from '../shared/api.config';

@Injectable({ providedIn: 'root' })
export class SchoolsService {
  private http = inject(HttpClient);

  getSchools() {
    return this.http.get<{ schools: School[] }>(`${API_URL}/schools`);
  }

  getSchoolById(id: string | number) {
    return this.http.get<{ school: School }>(`${API_URL}/schools/${id}`).pipe(
      map((resData) => resData.school),
      catchError(() => throwError(() => new Error('Unable to load school details.')))
    );
  }

  createSchool(data: FormData) {
    return this.http.post(`${API_URL}/admin/schools`, data);
  }

  updateSchool(id: number, data: FormData) {
    return this.http.put(`${API_URL}/admin/schools/${id}`, data);
  }

  deleteSchool(id: number) {
    return this.http.delete(`${API_URL}/admin/schools/${id}`);
  }
}
