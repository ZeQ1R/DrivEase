import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  readonly toasts = signal<Toast[]>([]);

  show(text: string, type: Toast['type'] = 'info', durationMs = 4500) {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, text, type }]);
    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
    return id;
  }

  success(text: string, durationMs?: number) { return this.show(text, 'success', durationMs); }
  error(text: string, durationMs?: number) { return this.show(text, 'error', durationMs); }
  info(text: string, durationMs?: number) { return this.show(text, 'info', durationMs); }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
