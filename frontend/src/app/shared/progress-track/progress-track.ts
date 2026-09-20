import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type RegistrationStatus = 'pending' | 'approved' | 'enrolled';

@Component({
  selector: 'app-progress-track',
  imports: [CommonModule],
  templateUrl: './progress-track.html',
  styleUrl: './progress-track.css',
})
export class ProgressTrack {
  @Input({ required: true }) status!: string;

  stops: { key: RegistrationStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'enrolled', label: 'Enrolled' },
  ];

  get activeIndex() {
    return this.stops.findIndex((s) => s.key === this.status);
  }

  get filledWidth() {
    return this.activeIndex <= 0 ? 0 : this.activeIndex === 1 ? 50 : 100;
  }

}
