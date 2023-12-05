import {
  Component,
  Inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CollectionApiService } from '../../service/collection-api.service';
import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';

@Component({
  selector: 'app-inspector-service-secure',
  standalone: true,
  imports: [
    FormsModule,
    MatDividerModule,
    MatListModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-service-secure.component.html',
  styleUrl: './inspector-service-secure.component.scss',
})
export class InspectorServiceSecureComponent implements OnChanges {
  @Input() service!: ServiceRestDto;
  @Input() userIndex!: number | undefined;
  data: any;
  reveal = false;
  isAdministrator = false;

  constructor(
    private readonly collectionApi: CollectionApiService,
    private readonly graphApi: GraphApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit(): void {
    if (this.service && this.userIndex) {
      this.graphApi
        .getUpstream(this.service.vertex, this.userIndex, [
          'administrator',
          'lead-developer',
        ])
        .subscribe((data) => {
          this.isAdministrator =
            data.filter((data) => {
              return data.collection.guid === this.user.guid;
            }).length > 0;
        });
    }
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['service']) {
      this.loadServiceSecure();
    }
    this.isAdministrator = false;
  }

  private loadServiceSecure() {
    if (this.service) {
      this.collectionApi.getServiceSecure(this.service.id).subscribe((data) => {
        this.data = data;
      });
    }
  }
}
