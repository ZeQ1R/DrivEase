import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [],
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.css',
})
export class ToastHost {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts;

  dismiss(id: number) { this.toastService.dismiss(id); }
}
