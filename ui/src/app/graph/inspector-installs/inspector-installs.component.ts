import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { IntentionActionPointerRestDto } from '../../service/dto/intention-action-pointer-rest.dto';
import { IntentionApiService } from '../../service/intention-api.service';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { CollectionUtilService } from '../../service/collection-util.service';

@Component({
  selector: 'app-inspector-installs',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
    MatMenuModule,
    MatListModule,
    MatTooltipModule,
    OutcomeIconComponent,
  ],
  templateUrl: './inspector-installs.component.html',
  styleUrls: ['./inspector-installs.component.scss'],
})
export class InspectorInstallsComponent implements OnInit, OnChanges {
  @Input() pointers!: IntentionActionPointerRestDto[] | undefined;

  current: IntentionActionPointerRestDto | undefined;

  constructor(
    private readonly router: Router,
    private readonly collectionUtil: CollectionUtilService,
    private readonly intention: IntentionApiService,
  ) {}

  ngOnInit(): void {
    this.navigateCurrent();
    this.navigate(0);
  }

  ngOnChanges(): void {
    this.ngOnInit();
  }

  viewIntention(id: string) {
    this.router.navigate([
      '/intention/history',
      {
        index: 0,
        size: 10,
        field: 'id',
        value: id,
        status: 'all',
      },
    ]);
  }

  openServicePackage(serviceId: string, packageId: string) {
    this.collectionUtil.openServicePackage(serviceId, packageId);
  }

  navigateCurrent() {
    this.current = this.pointers
      ? this.pointers[this.pointers.length - 1]
      : undefined;
  }

  navigate(move: number) {
    if (!this.pointers || !this.current) {
      return;
    }
    const index = this.pointers.findIndex(
      (history) => history.intention === this.current?.intention,
    );
    const history = this.pointers[index + move];
    if (!history) {
      return;
    }
    const actionId = history.action?.split('#').pop();
    this.intention.getIntention(history.intention).subscribe((result) => {
      if (this.current) {
        this.current = {
          ...history,
          source: {
            intention: result,
            action: result.actions.find(
              (action: any) => action.id === actionId,
            ),
          },
        };
      }
    });
  }

  isFirst() {
    if (!this.pointers || !this.current) {
      return true;
    }

    return this.current.intention === this.pointers[0].intention;
  }

  isLast() {
    if (!this.pointers || !this.current) {
      return true;
    }

    return (
      this.current.intention ===
      this.pointers[this.pointers.length - 1].intention
    );
  }
}
