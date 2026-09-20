import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-count-up',
  standalone: true,
  imports: [],
  template: `{{ display() }}`,
})
export class CountUp {
  value = input.required<number>();
  duration = input(900);

  display = signal('0');

  private frame: number | null = null;
  private from = 0;

  constructor() {
    effect(() => {
      const target = Number(this.value()) || 0;

      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.display.set(this.format(target));
        this.from = target;
        return;
      }

      if (this.frame !== null) cancelAnimationFrame(this.frame);

      const start = performance.now();
      const from = this.from;
      const span = target - from;

      const step = (now: number) => {
        const p = Math.min(1, (now - start) / this.duration());
        const eased = 1 - Math.pow(1 - p, 3);
        this.display.set(this.format(from + span * eased));
        if (p < 1) {
          this.frame = requestAnimationFrame(step);
        } else {
          this.frame = null;
          this.from = target;
        }
      };

      this.frame = requestAnimationFrame(step);
    });
  }

  private format(n: number) {
    return Number(n.toFixed(1)).toString();
  }
}
