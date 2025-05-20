import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-outcome-icon',
  imports: [MatIconModule],
  templateUrl: './outcome-icon.component.html',
  styleUrl: './outcome-icon.component.scss',
})
export class OutcomeIconComponent {
  readonly outcome = input.required<string | undefined>();
}
