import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-inspector-vertex-field',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './inspector-vertex-field.component.html',
  styleUrl: './inspector-vertex-field.component.scss',
})
export class InspectorVertexFieldComponent {
  @Input() public type!: string;
  @Input() public value: any;
}
