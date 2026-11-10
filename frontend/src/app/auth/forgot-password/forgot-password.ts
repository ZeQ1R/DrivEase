import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, AuthShell],
  templateUrl: './forgot-password.html',
  styleUrls: ['../../shared/auth-shell/auth-form.css', './forgot-password.css'],
})
export class ForgotPassword {
  private authService = inject(AuthService);

  email = '';
  loading = signal(false);
  sent = signal(false);
  message = signal('');

  onSubmit() {
    if (!this.email.trim()) { this.message.set('Please enter your email address.'); return; }
    this.loading.set(true);
    this.message.set('');
    this.authService.forgotPassword(this.email.trim()).subscribe({
      next: (res) => { this.loading.set(false); this.sent.set(true); this.message.set(res.message); },
      error: (err) => {
        this.loading.set(false);
        this.message.set(err.error?.message || 'Something went wrong. Please try again.');
      },
    });
  }
}