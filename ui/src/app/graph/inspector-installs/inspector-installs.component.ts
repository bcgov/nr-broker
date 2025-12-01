import { Component, input, OnChanges, OnInit, inject, signal } from '@angular/core';
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
import { IntentionActionPointerDto } from '../../service/persistence/dto/intention-action-pointer.dto';
import { IntentionApiService } from '../../service/intention-api.service';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { CollectionUtilService } from '../../service/collection-util.service';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

@Component({
  selector: 'app-inspector-installs',
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
    DetailsItemComponent,
  ],
  templateUrl: './inspector-installs.component.html',
  styleUrls: ['./inspector-installs.component.scss'],
})
export class InspectorInstallsComponent implements OnInit, OnChanges {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly intention = inject(IntentionApiService);

  pointers = input.required<IntentionActionPointerDto[]>();

  pointer$ = new Subject<IntentionActionPointerDto | undefined>();
  readonly current = signal<IntentionActionPointerDto | undefined>(undefined);

  ngOnInit(): void {
    this.pointer$
      .pipe(
        distinctUntilChanged(),
        switchMap((pointer) => {
          return combineLatest([
            pointer ? this.intention.getIntention(pointer.intention) : of(null),
            of(pointer),
          ]);
        }),
      )
      .subscribe(([result, pointer]) => {
        if (result && pointer) {
          const actionId = pointer.action?.split('#').pop();
          this.current.set({
            ...pointer,
            source: {
              intention: result,
              action: result.actions.find(
                (action: any) => action.id === actionId,
              ),
            },
          });
        } else {
          this.current.set(undefined);
        }
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      const config = new MatSnackBarConfig();
      config.duration = 5000;
      config.verticalPosition = 'bottom';
      this.snackBar.open('User not found', 'Dismiss', config);
    }
  }

  navigateCurrent() {
    const pointerValue = this.pointers();
    const current =
      pointerValue && pointerValue.length > 0
        ? pointerValue[pointerValue.length - 1]
        : undefined;
    this.pointer$.next(current);
  }

  navigate(move: number) {
    const pointerValue = this.pointers();
    if (!pointerValue || !this.current) {
      return;
    }
    const index = pointerValue.findIndex(
      (history) => history.intention === this.current()?.intention,
    );
    const history = pointerValue[index + move];
    if (!history) {
      return;
    }

    this.pointer$.next(history);
  }

  isFirst() {
    const pointerValue = this.pointers();
    if (!pointerValue || !this.current || pointerValue.length === 0) {
      return true;
    }

    return this.current()?.intention === pointerValue[0].intention;
  }

  isLast() {
    const pointerValue = this.pointers();
    if (!pointerValue || !this.current || pointerValue.length === 0) {
      return true;
    }

    return (
      this.current()?.intention === pointerValue[pointerValue.length - 1].intention
    );
  }
}
