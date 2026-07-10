

import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

export interface AuthUser{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
}

interface AuthResponse{
    message: string;
    token:string;
    user: AuthUser;
}

export interface SignUpPayload{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
}

export interface RegisterSchool{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    postalCode: number;
    embg: number;
}

@Injectable({
    providedIn: 'root'
})

export class AuthService{
    private http = inject(HttpClient)
    private apiUrl = 'http://localhost:3000/auth'

    signup(payload: SignUpPayload){
        return this.http.post<AuthResponse>(`${this.apiUrl}/signup`,payload)
    }

    login(email:string, password: string){
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`,{email,password})
    }

    registerSchool(registerschool: RegisterSchool){
        return this.http.post<AuthResponse>(`${this.apiUrl}/register-school`, registerschool)
    }

    storeSession(response: AuthResponse){
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
    }

    getCurrentUser(): AuthUser | null{
        const raw = localStorage.getItem('user')
        return raw ? JSON.parse(raw) : null
    }

    isLoggedIn() :boolean {
        return !!localStorage.getItem('token')
    }

    logout(){
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }
}
