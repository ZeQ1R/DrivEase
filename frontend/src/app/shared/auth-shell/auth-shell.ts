import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
})
export class AuthShell {
  eyebrow = input.required<string>()
  headline = input.required<string[]>()
  sub = input.required<string>()
  image = input('/auth-hero.jpg')

  imageOk = signal(true)
  year = new Date().getFullYear()
}
