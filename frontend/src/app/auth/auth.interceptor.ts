import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      // A 401 on a request we sent WITH a token means the token expired or is invalid.
      // Clear the stale session and send the user to log in again.
      if (err.status === 401 && token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/login'], { queryParams: { expired: true } });
      }
      return throwError(() => err);
    })
  );
};
