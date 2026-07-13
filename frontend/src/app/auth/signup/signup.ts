import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { debounceTime } from 'rxjs';
import { AuthService } from '../auth.service';
import { AuthPanel } from '../../shared/auth-panel/auth-panel';
import { LoadingScreen } from "../../shared/loading-screen/loading-screen/loading-screen";

let initialValue = '';

const savedForm = window.localStorage.getItem('saved-signup-form');

if (savedForm) {
  const loadedForm = JSON.parse(savedForm);
  initialValue = loadedForm.email;
}

function equalValues(controlName1: string, controlName2: string) {
  return (control: AbstractControl) => {
    const val1 = control.get(controlName1)?.value;
    const val2 = control.get(controlName2)?.value;

    if (val1 === val2) {
      return null;
    }

    return { passwordNotEqual: true };
  };
}

@Component({
  selector: 'app-signup',
  imports: [RouterLink, ReactiveFormsModule, AuthPanel, LoadingScreen],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup implements OnInit {
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService)
  private http = inject(HttpClient);
  private router = inject(Router);

  signupError = '';
  submitting = signal(false)

  form = new FormGroup({
    email: new FormControl(initialValue, {
      validators: [Validators.email, Validators.required],
    }),
    passwords: new FormGroup(
      {
        password: new FormControl('', {
          validators: [Validators.required, Validators.minLength(6)],
        }),
        confirmPassword: new FormControl('', {
          validators: [Validators.required, Validators.minLength(6)],
        }),
      },
      {
        validators: [equalValues('password', 'confirmPassword')],
      }
    ),
    firstName: new FormControl('', {
      validators: [Validators.required],
    }),
    lastName: new FormControl('', {
      validators: [Validators.required],
    }),
    phone: new FormControl('', {
      validators: [Validators.required],
    }),
    address: new FormGroup({
      city: new FormControl('', {
        validators: [Validators.required],
      }),
      postalCode: new FormControl('', {
        validators: [Validators.required],
      }),
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
      this.form.controls.passwords.controls.password.touched &&
      this.form.controls.passwords.controls.password.dirty &&
      this.form.controls.passwords.controls.password.invalid
    );
  }

  get passwordsNotEqual() {
    return (
      this.form.controls.passwords.hasError('passwordNotEqual') &&
      this.form.controls.passwords.touched
    );
  }

  ngOnInit() {
    const subscription = this.form.valueChanges.pipe(debounceTime(500)).subscribe({
      next: (value) => {
        window.localStorage.setItem(
          'saved-signup-form',
          JSON.stringify({ email: value.email })
        );
      },
    });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  onSignUp() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.signupError = '';
    this.submitting.set(true)

    this.authService.signup({
        firstName: this.form.value.firstName!,
        lastName: this.form.value.lastName!,
        email: this.form.value.email!,
        password: this.form.value.passwords!.password!,
        phone: this.form.value.phone!,
      })
      .subscribe({
        next: (res) => {
          this.authService.storeSession(res)
          this.router.navigate(['/login'], {queryParams: {checkEmail: true}});
        },
        error: (err) => {
          this.submitting.set(false)
          this.signupError =
            err.error?.message || 'Signup failed. Please try again.';
        },
      });
  }

  onReset() {
    this.form.reset();
    this.signupError = '';
  }
}