import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-outcome-icon',
    imports: [MatIconModule],
    templateUrl: './outcome-icon.component.html',
    styleUrl: './outcome-icon.component.scss'
})
export class OutcomeIconComponent {
  @Input() outcome!: string | undefined;
}
