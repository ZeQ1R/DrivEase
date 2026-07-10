import { Component, Input, input } from '@angular/core';
import { School } from '../../schools/school.model';
import { StarRating } from '../star-rating/star-rating';
import { FeatureBadge } from '../feature-badge/feature-badge';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-school-card',
  imports: [StarRating,FeatureBadge,RouterLink],
  templateUrl: './school-card.html',
  styleUrl: './school-card.css',
})
export class SchoolCard {

  @Input({ required: true }) school!: School;

  get imageUrl() {
    return `http://localhost:3000/${this.school.image.src}`
  }
}
