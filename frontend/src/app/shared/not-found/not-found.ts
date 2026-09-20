import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavBar } from '../nav-bar/nav-bar';
import { LaneDivider } from '../lane-divider/lane-divider';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, LaneDivider],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {
  private location = inject(Location);

  goBack() {
    this.location.back();
  }
}
