import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AuthService } from '../auth.service';
import { AuthPanel } from '../../shared/auth-panel/auth-panel';
import { LoadingScreen } from "../../shared/loading-screen/loading-screen/loading-screen";

let initialValue = '';

const savedForm = window.localStorage.getItem('saved-login-form');

if (savedForm) {
  const loadedForm = JSON.parse(savedForm);
  initialValue = loadedForm.email;
}

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule, AuthPanel, LoadingScreen],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService)
  private destroyRef = inject(DestroyRef);

  loginError = '';
  loading = signal(false)

  form = new FormGroup({
    email: new FormControl(initialValue, {
      validators: [Validators.email, Validators.required],
    }),
    password: new FormControl('', {
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  get emailIsInvalid() {
    return (
      this.form.controls.email.touched &&
      this.form.controls.email.dirty &&
      this.form.controls.email.invalid
    );
  }

  get passwordIsInvalid() {
    return (
      this.form.controls.password.touched &&
      this.form.controls.password.dirty &&
      this.form.controls.password.invalid
    );
  }

  ngOnInit() {
    const subscription = this.form.valueChanges.pipe(debounceTime(500)).subscribe({
      next: (value) => {
        window.localStorage.setItem(
          'saved-login-form',
          JSON.stringify({ email: value.email })
        );
      },
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginError = '';

    this.authService.login(this.form.value.email!, this.form.value.password!)
      .subscribe({
        next: (res) => {
          
          this.authService.storeSession(res)
          this.loading.set(true)
          const role = res.user.role
          setTimeout(() => {
            if(role === 'school_admin'){
              this.router.navigate(['/school-admin-dashboard'],{queryParams: {checkEmail:true}});
            }else if(role === 'platform_admin'){
              this.router.navigate(['/platform-admin'],{queryParams: {checkEmail:true}});
            }else if(role === 'instructor'){
              this.router.navigate(['/instructor'], {queryParams: {checkEmail: true}})
            }else{
              this.router.navigate(['/student-platform-dashboard'], {queryParams: {checkEmail:true}});
            }
          },5000)
        },
        error: (err) => {
          this.loginError =
            err.error?.message || 'Login failed. Please try again.';
        },
      });
  }
}
