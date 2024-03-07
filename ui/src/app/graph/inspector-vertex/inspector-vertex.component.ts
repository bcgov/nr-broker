import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  CollectionConfigMap,
  VertexNavigation,
  UserDto,
} from '../../service/graph.types';
import { AsyncPipe, KeyValuePipe } from '@angular/common';
import { InspectorAccountComponent } from '../inspector-account/inspector-account.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CURRENT_USER } from '../../app-initialize.factory';
import { InspectorTeamComponent } from '../inspector-team/inspector-team.component';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';
import { InspectorServiceSecureComponent } from '../inspector-service-secure/inspector-service-secure.component';
import { InspectorIntentionsComponent } from '../inspector-intentions/inspector-intentions.component';
import { InspectorInstancesComponent } from '../inspector-instances/inspector-instances.component';

@Component({
  selector: 'app-inspector-vertex',
  standalone: true,
  imports: [
    KeyValuePipe,
    AsyncPipe,
    InspectorAccountComponent,
    InspectorInstallsComponent,
    InspectorInstancesComponent,
    InspectorIntentionsComponent,
    InspectorServiceSecureComponent,
    InspectorTeamComponent,
    MatDividerModule,
    MatTableModule,
  ],
  templateUrl: './inspector-vertex.component.html',
  styleUrl: './inspector-vertex.component.scss',
})
export class InspectorVertexComponent implements OnChanges {
  @Input() collection!: string;
  @Input() collectionConfig!: CollectionConfigMap | null;
  @Input() collectionData: any = null;
  @Input() outboundConnections!: Observable<VertexNavigation | null>;

  @Output() refreshData = new EventEmitter();

  filteredCollectionData: any = null;

  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  propDisplayedColumns: string[] = ['key', 'value'];

  constructor(@Inject(CURRENT_USER) public readonly user: UserDto) {}

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['collectionConfig'] || changes['collectionData']) &&
      this.collectionConfig &&
      this.collectionData
    ) {
      const filteredCollectionData: any = {
        ...this.collectionData,
      };

      delete filteredCollectionData.id;
      delete filteredCollectionData.vertex;
      delete filteredCollectionData.name;

      for (const [key, value] of Object.entries(
        this.collectionConfig[this.collection].fields,
      )) {
        if (value.type === 'embeddedDoc' || value.type === 'embeddedDocArray') {
          delete filteredCollectionData[key];
        }
      }

      for (const key of Object.keys(filteredCollectionData)) {
        if (!this.collectionConfig[this.collection].fields[key]) {
          delete filteredCollectionData[key];
        }
      }

      this.filteredCollectionData = filteredCollectionData;
    }
  }

  getFieldType(key: string) {
    if (!this.collectionConfig) {
      return '';
    }
    return this.collectionConfig[this.collection].fields[key].type;
  }
}
