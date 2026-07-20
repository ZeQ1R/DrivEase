import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavBar } from '../../shared/nav-bar/nav-bar';
import { AuthService } from '../auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, NavBar],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  private token = this.route.snapshot.queryParamMap.get('token') ?? '';
  hasToken = !!this.token;

  password = '';
  confirm = '';
  showPassword = signal(false);
  loading = signal(false);
  message = signal('');

  togglePassword() { this.showPassword.update(v => !v); }

  onSubmit() {
    if (this.password.length < 6) { this.message.set('Password must be at least 6 characters.'); return; }
    if (this.password !== this.confirm) { this.message.set('Passwords do not match.'); return; }

    this.loading.set(true);
    this.message.set('');
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Password updated. You can now sign in.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.message.set(err.error?.message || 'Failed to reset password.');
      },
    });
  }
}
