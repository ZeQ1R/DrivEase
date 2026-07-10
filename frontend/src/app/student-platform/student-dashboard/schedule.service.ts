import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";

export interface Slot { 
    id: number; 
    slot_date: string; 
    slot_time: string; 
    slot_type: string;
    note: string; 
}
export interface Booking { 
    id: number; 
    slot_date: string; 
    slot_time: string; 
    note: string; 
}


@Injectable({
    providedIn: 'root'
})

export class ScheduleService {
    private http = inject(HttpClient)
    private api = 'http://localhost:3000'

    getAvailableSlots() {
        return this.http.get<{slots: Slot[]}>(`${this.api}/slots/available`)
    }
    bookSlot(id:number){
        return this.http.post<{message: string}>(`${this.api}/slots/${id}/book`, {})
    }

    getMyBookings(){
        return this.http.get<{bookings: Booking[]}>(`${this.api}/bookings/me`)
    }

    createSlot(slotDate: string, slotTime: string, note: string, slotType: string = 'practical') {
        return this.http.post(`${this.api}/admin/slots`, { slotDate, slotTime, note, slotType });
    }

    getMyHours(){
        return this.http.get<{completed: number; required: number}>(`${this.api}/hours/me`)
    }

    getSchoolBookings() { 
        return this.http.get<{ bookings: any[] }>(`${this.api}/admin/bookings`)
    }
    markAttended(bookingId: number) { 
        return this.http.patch(`${this.api}/admin/bookings/${bookingId}/attended`, {})
    }
}