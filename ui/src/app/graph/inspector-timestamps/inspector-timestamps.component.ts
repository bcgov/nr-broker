import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimestampDto } from '../../service/persistence/dto/timestamp.dto';
import { MatListModule } from '@angular/material/list';

@Component({
    selector: 'app-inspector-timestamps',
    imports: [CommonModule, MatListModule],
    templateUrl: './inspector-timestamps.component.html',
    styleUrl: './inspector-timestamps.component.scss'
})
export class InspectorTimestampsComponent {
  @Input() timestamps?: TimestampDto;
}
