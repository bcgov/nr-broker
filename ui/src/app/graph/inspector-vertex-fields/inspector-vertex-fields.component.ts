import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';

@Component({
  selector: 'app-inspector-vertex-fields',
  standalone: true,
  imports: [DatePipe, KeyValuePipe, MatTableModule],
  templateUrl: './inspector-vertex-fields.component.html',
  styleUrl: './inspector-vertex-fields.component.scss',
})
export class InspectorVertexFieldsComponent implements OnChanges {
  @Input() collection!: CollectionNames;
  @Input() collectionConfig!: CollectionConfigRestDto;
  @Input() collectionData: any = null;
  @Input() filter!: 'yes' | 'no';

  filteredCollectionData: any = null;
  public filteredCollectionCount = 0;
  propDisplayedColumns: string[] = ['key', 'value'];

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['collectionConfig'] || changes['collectionData']) &&
      this.collectionConfig &&
      this.collectionData
    ) {
      const filteredCollectionData: any = {
        ...this.collectionData,
      };

      for (const [key, value] of Object.entries(this.collectionConfig.fields)) {
        if (this.filter === 'no' && !filteredCollectionData[key]) {
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
        if (!this.collectionConfig.fields[key]) {
          delete filteredCollectionData[key];
        }
      }

      this.filteredCollectionData = filteredCollectionData;
      this.filteredCollectionCount = Object.keys(filteredCollectionData).length;
    }
  }

  getFieldType(key: string) {
    if (!this.collectionConfig) {
      return '';
    }
    return this.collectionConfig.fields[key]?.type;
  }
}
