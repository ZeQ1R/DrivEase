import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { AuthService } from '../auth.service';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { ToastService } from '../../shared/toast/toast.service';
import { computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { isStrongPassword, passwordRules } from '../password-rules';

function fullName(control: AbstractControl): ValidationErrors | null {
  const parts = String(control.value ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? null : { fullName: true };
}

function strongPassword(control: AbstractControl): ValidationErrors | null {
  return isStrongPassword(String(control.value ?? '')) ? null : { weakPassword: true };
}

@Component({
  selector: 'app-signup',
  imports: [RouterLink, ReactiveFormsModule, AuthShell],
  templateUrl: './signup.html',
  styleUrls: ['../../shared/auth-shell/auth-form.css', './signup.css'],
})
export class Signup implements OnInit {
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  signupError = '';
  submitting = signal(false);
  showPassword = signal(false);
  checkingEmail = signal(false);
  emailTaken = signal(false);

  togglePassword() { this.showPassword.update(v => !v); }

  form = new FormGroup({
    fullName: new FormControl('', { validators: [Validators.required, fullName] }),
    email: new FormControl('', { validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { validators: [Validators.required, strongPassword] }),
    terms: new FormControl(false, { validators: [Validators.requiredTrue] }),
  });

    private passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  rules = computed(() => passwordRules(this.passwordValue() ?? ''));

  get nameIsInvalid() { const c = this.form.controls.fullName; return c.touched && c.invalid; }
  get emailIsInvalid() { const c = this.form.controls.email; return c.touched && c.invalid; }
  get passwordIsInvalid() { const c = this.form.controls.password; return c.touched && c.invalid; }
  get termsIsInvalid() { const c = this.form.controls.terms; return c.touched && c.invalid; }

  ngOnInit() {
    const sub = this.form.controls.email.valueChanges.pipe(debounceTime(500)).subscribe((email) => {
      this.emailTaken.set(false);
      if (!email || this.form.controls.email.invalid) return;

      this.checkingEmail.set(true);
      this.authService.checkEmailExists(email).subscribe({
        next: (res) => { this.checkingEmail.set(false); this.emailTaken.set(res.exists); },
        error: () => this.checkingEmail.set(false),
      });
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  onSignUp() {
    if (this.form.invalid || this.emailTaken()) {
      this.form.markAllAsTouched();
      return;
    }

    const [firstName, ...rest] = this.form.value.fullName!.trim().split(/\s+/);
    const lastName = rest.join(' ');

    this.signupError = '';
    this.submitting.set(true);

    this.authService.signup({
      firstName,
      lastName,
      email: this.form.value.email!,
      password: this.form.value.password!,
      phone: '',
    }).subscribe({
      next: (res) => {
        this.authService.storeSession(res);
        this.toast.success('Account created! Check your email to confirm before signing in.', 7000);
        this.router.navigate(['/login'], { queryParams: { checkEmail: true } });
      },
      error: (err) => {
        this.submitting.set(false);
        this.signupError = err.error?.message || 'Signup failed. Please try again.';
      },
    });
  }
}