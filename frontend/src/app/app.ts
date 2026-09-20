import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastHost } from './shared/toast/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('routeFade', [
      transition('* => *', [
        style({ opacity: 0 }),
        animate('240ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class App {
  private contexts = inject(ChildrenOutletContexts);

  routeKey() {
    return this.contexts.getContext('primary')?.route?.snapshot?.routeConfig?.path ?? '';
  }
}
