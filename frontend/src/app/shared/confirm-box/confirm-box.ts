import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-box',
  imports: [],
  templateUrl: './confirm-box.html',
  styleUrl: './confirm-box.css',
})
export class ConfirmBox {
  message = input('Are you Sure?')
  confirmText = input('Yes')
  cancelText = input('No')
  tone = input<'danger' | 'primary'>('danger')

  yes = output<void>()
  no = output<void>()

}

