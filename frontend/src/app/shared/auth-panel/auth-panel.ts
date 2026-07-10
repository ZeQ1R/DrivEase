import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LaneDivider } from '../lane-divider/lane-divider';

@Component({
  selector: 'app-auth-panel',
  imports: [RouterLink,LaneDivider],
  templateUrl: './auth-panel.html',
  styleUrl: './auth-panel.css',
})
export class AuthPanel {
  @Input({ required: true }) headline!: string[];
  @Input({ required: true }) sub!: string;
  @Input() bullets?: string[];
  @Input({ required: true }) switchText!: string;
  @Input({ required: true }) switchLabel!: string;
  @Input({ required: true }) switchRoute!: string;
}
