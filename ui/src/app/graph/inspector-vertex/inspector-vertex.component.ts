import {
  Component,
  Inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';

import { InspectorAccountComponent } from '../inspector-account/inspector-account.component';
import { InspectorTeamComponent } from '../inspector-team/inspector-team.component';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';
import { InspectorServiceSecureComponent } from '../inspector-service-secure/inspector-service-secure.component';
import { InspectorInstancesComponent } from '../inspector-instances/inspector-instances.component';
import { InspectorVaultComponent } from '../inspector-vault/inspector-vault.component';
import { VertexTagsComponent } from '../vertex-tags/vertex-tags.component';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { InspectorVertexFieldsComponent } from '../inspector-vertex-fields/inspector-vertex-fields.component';
import { CollectionApiService } from '../../service/collection-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { CollectionCombo } from '../../service/dto/collection-search-result.dto';
import { CollectionUtilService } from '../../service/collection-util.service';
import { UserSelfRestDto } from '../../service/dto/user-rest.dto';

@Component({
    selector: 'app-inspector-vertex',
    imports: [
        InspectorAccountComponent,
        InspectorInstallsComponent,
        InspectorInstancesComponent,
        InspectorServiceSecureComponent,
        InspectorTeamComponent,
        InspectorVaultComponent,
        InspectorVertexFieldsComponent,
        VertexTagsComponent,
        MatDividerModule,
    ],
    templateUrl: './inspector-vertex.component.html',
    styleUrl: './inspector-vertex.component.scss'
})
export class InspectorVertexComponent implements OnChanges {
  @Input() collection!: CollectionNames;
  @Input() collectionConfig!: CollectionConfigRestDto;
  @Input() collectionId!: string | null;
  @Input() comboData!: CollectionCombo<any>;

  // Permissions
  @Input() hasSudo = false;
  @Input() hasUpdate = false;
  serviceDetails: any = null;

  constructor(
    private readonly collectionApi: CollectionApiService,
    public readonly collectionUtil: CollectionUtilService,
    @Inject(CURRENT_USER) public readonly user: UserSelfRestDto,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['collection']) {
      this.loadServiceDetails();
    }
  }

  private loadServiceDetails() {
    if (this.collection === 'service') {
      this.collectionApi
        .getServiceDetails(this.comboData.collection.id)
        .subscribe((data: any) => {
          this.serviceDetails = data;
        });
    }
  }
}
