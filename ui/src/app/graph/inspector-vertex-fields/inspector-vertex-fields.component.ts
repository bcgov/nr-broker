import {
  Component,
  OnChanges,
  SimpleChanges,
  input,
} from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import {
  CollectionDtoUnion,
  CollectionNames,
} from '../../service/persistence/dto/collection-dto-union.type';
import { InspectorVertexFieldComponent } from '../inspector-vertex-field/inspector-vertex-field.component';

@Component({
  selector: 'app-inspector-vertex-fields',
  imports: [
    InspectorVertexFieldComponent,
    KeyValuePipe,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-vertex-fields.component.html',
  styleUrl: './inspector-vertex-fields.component.scss',
})
export class InspectorVertexFieldsComponent implements OnChanges {
  readonly collection = input.required<CollectionNames>();
  readonly collectionConfig = input.required<CollectionConfigDto>();
  readonly collectionData = input<
    CollectionDtoUnion[keyof CollectionDtoUnion] | null
  >(null);
  readonly filter = input.required<'yes' | 'no'>();
  readonly showHelp = input(false);

  filteredCollectionData: any = null;
  public filteredCollectionCount = 0;
  propDisplayedColumns: string[] = ['key', 'value'];

  ngOnChanges(changes: SimpleChanges) {
    const collectionData = this.collectionData();
    if (
      (changes['collectionConfig'] || changes['collectionData']) &&
      this.collectionConfig() &&
      collectionData
    ) {
      const filteredCollectionData: any = {
        ...collectionData,
      };

      for (const [key, value] of Object.entries(this.collectionConfig().fields)) {
        if (
          this.filter() === 'no' &&
          filteredCollectionData[key] === undefined
        ) {
          filteredCollectionData[key] = '';
        }
        if (value.type === 'embeddedDoc' || value.type === 'embeddedDocArray') {
          delete filteredCollectionData[key];
        }
      }

      delete filteredCollectionData.id;
      delete filteredCollectionData.vertex;
      delete filteredCollectionData.name;

      for (const key of Object.keys(filteredCollectionData)) {
        if (!this.collectionConfig().fields[key]) {
          delete filteredCollectionData[key];
        }
      }

      this.filteredCollectionData = filteredCollectionData;
      this.filteredCollectionCount = Object.keys(filteredCollectionData).length;
    }
  }

  getFieldConfig(key: string) {
    if (!this.collectionConfig()) {
      return undefined;
    }
    return this.collectionConfig().fields[key];
  }
}
