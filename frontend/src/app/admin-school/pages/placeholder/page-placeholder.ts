import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

// Temporary page used until each section is built.
@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  template: `<h1>{{ title }}</h1><p>This section is coming soon.</p>`,
  styles: [`h1 { margin: 0 0 8px; font-size: 24px; } p { color: #6b7280; }`],
})
export class PagePlaceholder {
  title = inject(ActivatedRoute).snapshot.data['title'];
}
