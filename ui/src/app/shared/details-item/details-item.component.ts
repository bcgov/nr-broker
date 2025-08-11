import { booleanAttribute, Component, input } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'app-details-item',
  imports: [MatRippleModule],
  templateUrl: './details-item.component.html',
  styleUrl: './details-item.component.scss',
})
export class DetailsItemComponent {
  readonly item = input.required<string>();
  readonly value = input<string>();
  readonly clickable = input(false, { transform: booleanAttribute });
}
