import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AuthService } from '../auth.service';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { ToastService } from '../../shared/toast/toast.service';

const STORAGE_KEY = 'saved-login-form';

function loadSavedEmail(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw).email ?? '') : '';
  } catch {
    return '';
  }
}

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule, AuthShell],
  templateUrl: './login.html',
  styleUrls: ['../../shared/auth-shell/auth-form.css', './login.css'],
})
export class Login implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  loginError = '';
  sessionNotice = signal('');
  loading = signal(false);
  showPassword = signal(false);

  togglePassword() { this.showPassword.update(v => !v); }

  private savedEmail = loadSavedEmail();

  form = new FormGroup({
    email: new FormControl(this.savedEmail, { validators: [Validators.email, Validators.required] }),
    password: new FormControl('', { validators: [Validators.required, Validators.minLength(6)] }),
    remember: new FormControl(this.savedEmail !== ''),
  });

  get emailIsInvalid() {
    const c = this.form.controls.email;
    return c.touched && c.invalid;
  }

  get passwordIsInvalid() {
    const c = this.form.controls.password;
    return c.touched && c.invalid;
  }

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('expired')) {
      this.sessionNotice.set('Your session expired. Please sign in again to continue.');
    }

    const subscription = this.form.valueChanges.pipe(debounceTime(500)).subscribe((value) => {
      try {
        if (value.remember) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: value.email }));
        else window.localStorage.removeItem(STORAGE_KEY);
      } catch { /* storage unavailable: ignore */ }
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginError = '';
    this.loading.set(true);

    this.authService.login(this.form.value.email!, this.form.value.password!).subscribe({
      next: (res) => {
        this.authService.storeSession(res);
        this.toast.success(`Welcome back, ${res.user.firstName}!`);
        const role = res.user.role;
        if (role === 'school_admin') {
          this.router.navigate(['/school-admin-dashboard'], { queryParams: { checkEmail: true } });
        } else if (role === 'platform_admin') {
          this.router.navigate(['/platform-admin'], { queryParams: { checkEmail: true } });
        } else if (role === 'instructor') {
          this.router.navigate(['/instructor'], { queryParams: { checkEmail: true } });
        } else {
          this.router.navigate(['/student-platform-dashboard'], { queryParams: { checkEmail: true } });
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.loginError = err.error?.message || 'Login failed. Please try again.';
      },
    });
  }
}