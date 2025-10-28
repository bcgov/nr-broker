import { Component, OnChanges, SimpleChanges, input, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CollectionApiService } from '../../service/collection-api.service';
import { ServiceDto } from '../../service/persistence/dto/service.dto';
import { CURRENT_USER } from '../../app-initialize.factory';
import { InspectorServiceSecureDialogComponent } from '../inspector-service-secure-dialog/inspector-service-secure-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';

@Component({
  selector: 'app-inspector-service-secure',
  imports: [
    ClipboardModule,
    FormsModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-service-secure.component.html',
  styleUrl: './inspector-service-secure.component.scss',
})
export class InspectorServiceSecureComponent implements OnChanges {
  private readonly collectionApi = inject(CollectionApiService);
  readonly user = inject<UserSelfDto>(CURRENT_USER);
  private readonly dialog = inject(MatDialog);

  readonly service = input.required<ServiceDto>();
  readonly userIndex = input<number | undefined>();
  data: any;
  reveal = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['service']) {
      this.loadServiceSecure();
    }
  }

  public openSecureDialog(api: string, role: any) {
    this.dialog.open(InspectorServiceSecureDialogComponent, {
      width: '500px',
      data: {
        api,
        role,
      },
    });
  }

  private loadServiceSecure() {
    const service = this.service();
    if (service) {
      this.collectionApi.getServiceSecure(service.id).subscribe((data) => {
        this.data = data;
      });
    }
  }
}
