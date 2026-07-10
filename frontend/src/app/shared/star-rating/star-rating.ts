import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  imports: [],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.css',
})
export class StarRating {
  @Input({ required: true }) rating!: string | number;
  get ratingNum() { return Number(this.rating); }
  get roundedRating() { return Math.round(this.ratingNum); }
}
