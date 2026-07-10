import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-feature-badge',
  imports: [],
  templateUrl: './feature-badge.html',
  styleUrl: './feature-badge.css',
})
export class FeatureBadge {
  @Input({ required: true }) text!: string;
}
