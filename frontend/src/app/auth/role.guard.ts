import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";


export const roleGuard = (allowedRole: string) : CanActivateFn => {
    return () => {
        const auth = inject(AuthService)
        const router = inject(Router)
        const user = auth.getCurrentUser()

     
        if(user && user.role === allowedRole) return true

        router.navigate(['/'])
        return false
    }
}