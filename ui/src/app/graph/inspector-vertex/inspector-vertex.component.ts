import {
  Component,
  Inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';

import { UserDto, VertexNavigation } from '../../service/graph.types';
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
import { CollectionApiService } from '../../service/collection-api.service';
import { GraphApiService } from '../../service/graph-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';

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
export class InspectorVertexComponent implements OnChanges {
  @Input() collection!: CollectionNames;
  @Input() collectionConfig!: CollectionConfigRestDto;
  @Input() collectionData: any = null;
  @Input() outboundConnections!: VertexNavigation | null;
  @Input() hasSudo = false;
  @Input() hasUpdate = false;
  serviceDetails: any = null;

  constructor(
    private readonly collectionApi: CollectionApiService,
    private readonly graphApi: GraphApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['collection']) {
      this.loadServiceDetails();
    }
  }

  private loadServiceDetails() {
    if (this.collection === 'service') {
      this.collectionApi
        .getServiceDetails(this.collectionData.id)
        .subscribe((data: any) => {
          this.serviceDetails = data;
        });
    }
  }
}
