import { Component, Input } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';

import { VertexNavigation } from '../../service/graph.types';
import { InspectorAccountComponent } from '../inspector-account/inspector-account.component';
import { InspectorTeamComponent } from '../inspector-team/inspector-team.component';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';
import { InspectorServiceSecureComponent } from '../inspector-service-secure/inspector-service-secure.component';
import { InspectorIntentionsComponent } from '../inspector-intentions/inspector-intentions.component';
import { InspectorInstancesComponent } from '../inspector-instances/inspector-instances.component';
import { InspectorVaultComponent } from '../inspector-vault/inspector-vault.component';
import { VertexTagsComponent } from '../vertex-tags/vertex-tags.component';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { InspectorVertexFieldsComponent } from '../inspector-vertex-fields/inspector-vertex-fields.component';

@Component({
  selector: 'app-inspector-vertex',
  standalone: true,
  imports: [
    InspectorAccountComponent,
    InspectorInstallsComponent,
    InspectorInstancesComponent,
    InspectorIntentionsComponent,
    InspectorServiceSecureComponent,
    InspectorTeamComponent,
    InspectorVaultComponent,
    InspectorVertexFieldsComponent,
    VertexTagsComponent,
    MatDividerModule,
  ],
  templateUrl: './inspector-vertex.component.html',
  styleUrl: './inspector-vertex.component.scss',
})
export class InspectorVertexComponent {
  @Input() collection!: CollectionNames;
  @Input() collectionConfig!: CollectionConfigRestDto;
  @Input() collectionData: any = null;
  @Input() outboundConnections!: VertexNavigation | null;
}
