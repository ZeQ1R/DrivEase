import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthShell } from '../../shared/auth-shell/auth-shell';
import { AuthService } from '../auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { isStrongPassword, passwordRules } from '../password-rules';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, AuthShell],
  templateUrl: './reset-password.html',
  styleUrls: ['../../shared/auth-shell/auth-form.css', './reset-password.css'],
})
export class ResetPassword {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  private token = this.route.snapshot.queryParamMap.get('token') ?? '';
  hasToken = !!this.token;

  password = signal('');
  confirm = signal('');
  showPassword = signal(false);
  loading = signal(false);
  message = signal('');

  rules = computed(() => passwordRules(this.password()));

  togglePassword() { this.showPassword.update(v => !v); }

  onSubmit() {
    if (!isStrongPassword(this.password())) { this.message.set('Please choose a password that meets all the requirements.'); return; }
    if (this.password() !== this.confirm()) { this.message.set('Passwords do not match.'); return; }

    this.loading.set(true);
    this.message.set('');
    this.authService.resetPassword(this.token, this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Password updated. You can now log in.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.message.set(err.error?.message || 'Failed to reset password. The link may have expired.');
      },
    });
  }
}