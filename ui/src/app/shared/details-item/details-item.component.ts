import { booleanAttribute, Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'app-details-item',
  imports: [MatRippleModule],
  templateUrl: './details-item.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './details-item.component.scss',
})
export class DetailsItemComponent {
  readonly item = input.required<string>();
  readonly value = input<string>('');
  readonly clickable = input(false, { transform: booleanAttribute });
  readonly invertBackground = input(false, { transform: booleanAttribute });
}
