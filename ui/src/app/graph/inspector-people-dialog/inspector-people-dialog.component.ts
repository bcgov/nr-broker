import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { InspectorPeopleComponent } from '../inspector-people/inspector-people.component';

@Component({
  selector: 'app-inspector-people-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    InspectorPeopleComponent,
  ],
  templateUrl: './inspector-people-dialog.component.html',
  styleUrl: './inspector-people-dialog.component.scss',
})
export class InspectorPeopleDialogComponent {
  readonly data = inject<{
      collection: CollectionNames;
      vertex: string;
      showLinked: boolean;
  }>(MAT_DIALOG_DATA);
}
