import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimestampRestDto } from '../../service/dto/timestamp-rest.dto';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-inspector-timestamps',
  standalone: true,
  imports: [CommonModule, MatListModule],
  templateUrl: './inspector-timestamps.component.html',
  styleUrl: './inspector-timestamps.component.scss',
})
export class InspectorTimestampsComponent {
  @Input() timestamps?: TimestampRestDto;
}
