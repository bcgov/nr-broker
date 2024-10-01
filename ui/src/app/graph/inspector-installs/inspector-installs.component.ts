import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
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
    MatRippleModule,
    OutcomeIconComponent,
  ],
  templateUrl: './inspector-installs.component.html',
  styleUrls: ['./inspector-installs.component.scss'],
})
export class InspectorInstallsComponent implements OnInit, OnChanges {
  @Input() pointers!: IntentionActionPointerRestDto[] | undefined;

  pointer$ = new Subject<IntentionActionPointerRestDto>();
  current: IntentionActionPointerRestDto | undefined;

  constructor(
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly collectionUtil: CollectionUtilService,
    private readonly intention: IntentionApiService,
  ) {}

  ngOnInit(): void {
    this.pointer$
      .pipe(
        distinctUntilChanged(),
        switchMap((pointer) => {
          return combineLatest([
            this.intention.getIntention(pointer.intention),
            of(pointer),
          ]);
        }),
      )
      .subscribe(([result, pointer]) => {
        const actionId = pointer.action?.split('#').pop();
        this.current = {
          ...pointer,
          source: {
            intention: result,
            action: result.actions.find(
              (action: any) => action.id === actionId,
            ),
          },
        };
      });

    this.navigateCurrent();
  }

  ngOnChanges(): void {
    this.navigateCurrent();
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

  openUserInBrowserByGuid(guid: string) {
    try {
      this.collectionUtil.openUserInBrowserByGuid(guid);
    } catch (error) {
      const config = new MatSnackBarConfig();
      config.duration = 5000;
      config.verticalPosition = 'bottom';
      this.snackBar.open('User not found', 'Dismiss', config);
    }
  }

  navigateCurrent() {
    const current = this.pointers
      ? this.pointers[this.pointers.length - 1]
      : undefined;
    if (current) {
      this.pointer$.next(current);
    }
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

    this.pointer$.next(history);
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
