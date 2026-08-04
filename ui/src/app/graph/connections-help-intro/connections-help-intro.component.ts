import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-connections-help-intro',
  imports: [MatIconModule],
  templateUrl: './connections-help-intro.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './connections-help-intro.component.scss',
})
export class ConnectionsHelpIntroComponent {
  readonly collectionName = input<string>('collection');
}
