import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimestampDto } from '../../service/persistence/dto/timestamp.dto';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-inspector-timestamps',
  imports: [CommonModule, MatListModule],
  templateUrl: './inspector-timestamps.component.html',
  styleUrl: './inspector-timestamps.component.scss',
})
export class InspectorTimestampsComponent {
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() timestamps?: TimestampDto;
}
