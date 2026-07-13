import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";


@Injectable({
    providedIn: 'root'
})

export class InstructorService{
    private http = inject(HttpClient)
    private api = 'http://localhost:3000'

    getMyBookings(){
        return this.http.get<{bookings: any[]}>(`${this.api}/instructor/bookings`)
    }

    getMyStudents(){
        return this.http.get<{students: any[]}>(`${this.api}/instructor/students`)
    }

    markAttended(id: number){
        return this.http.patch(`${this.api}/instructor/bookings/${id}/attented`, {})
    }

    createSlot(slotDate:string, slotTime: string, note:string, slotType:string){
        return this.http.post(`${this.api}/instructor/slots`,{slotDate,slotTime,note,slotType})
    }
}