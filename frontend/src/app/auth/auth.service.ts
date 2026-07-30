import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../shared/api.config';

export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/auth`;

  signup(payload: SignUpPayload) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signup`, payload);
  }

  checkEmailExists(email: string) {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-email`, { params: { email } });
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password });
  }

  forgotPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, password });
  }

  storeSession(response: AuthResponse) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
  }

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
