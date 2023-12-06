import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EdgeNavigation,
  CollectionConfigMap,
  VertexNavigation,
  UserDto,
} from '../../service/graph.types';
import { KeyValuePipe } from '@angular/common';
import { InspectorAccountComponent } from '../inspector-account/inspector-account.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CURRENT_USER } from '../../app-initialize.factory';
import { InspectorTeamComponent } from '../inspector-team/inspector-team.component';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';
import { InspectorServiceSecureComponent } from '../inspector-service-secure/inspector-service-secure.component';
import { InspectorIntentionsComponent } from '../inspector-intentions/inspector-intentions.component';
import { CollectionFilterPipe } from '../collection-filter.pipe';

@Component({
  selector: 'app-inspector-vertex',
  standalone: true,
  imports: [
    CollectionFilterPipe,
    KeyValuePipe,
    InspectorAccountComponent,
    InspectorInstallsComponent,
    InspectorIntentionsComponent,
    InspectorServiceSecureComponent,
    InspectorTeamComponent,
    MatDividerModule,
    MatTableModule,
  ],
  templateUrl: './inspector-vertex.component.html',
  styleUrl: './inspector-vertex.component.scss',
})
export class InspectorVertexComponent {
  @Input() collection!: string;
  @Input() edgeConnections!: Observable<EdgeNavigation | null>;
  @Input() collectionConfig!: CollectionConfigMap | null;
  @Input() collectionData: any = null;
  @Input() outboundConnections!: Observable<VertexNavigation | null>;

  @Output() refreshData = new EventEmitter();

  propPeopleDisplayedColumns: string[] = ['role', 'name', 'via'];
  propDisplayedColumns: string[] = ['key', 'value'];

  constructor(@Inject(CURRENT_USER) public readonly user: UserDto) {}

  getFieldType(key: string) {
    if (!this.collectionConfig) {
      return '';
    }
    return this.collectionConfig[this.collection].fields[key].type;
  }
}
