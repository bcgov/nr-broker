import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

import { TimestampDto } from '../../service/persistence/dto/timestamp.dto';

@Component({
  selector: 'app-inspector-timestamps',
  imports: [CommonModule, DetailsItemComponent],
  templateUrl: './inspector-timestamps.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inspector-timestamps.component.scss',
})
export class InspectorTimestampsComponent {
  readonly timestamps = input<TimestampDto>();
  readonly layout = input<'narrow' | 'wide'>('wide');
}
