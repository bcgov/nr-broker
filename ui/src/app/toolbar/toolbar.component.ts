import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Inject,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../service/graph.types';
import { environment } from '../../environments/environment';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';
import { HealthStatusService } from '../service/health-status.service';
import { interval, Observable, of, Subject } from 'rxjs';
import {
  takeUntil,
  catchError,
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
} from 'rxjs/operators';
import {
  GraphTypeaheadData,
  GraphTypeaheadResult,
} from '../service/dto/graph-typeahead-result.dto';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GraphApiService } from '../service/graph-api.service';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { GraphUtilService } from '../service/graph-util.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  standalone: true,
  imports: [
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatDividerModule,
    CommonModule,
  ],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  @Output() sidebarClick = new EventEmitter<boolean>();
  filteredOptions!: Observable<GraphTypeaheadResult>;
  searchControl = new FormControl<{ id: string } | string | undefined>(
    undefined,
  );

  constructor(
    private readonly dialog: MatDialog,
    private readonly healthService: HealthStatusService,
    private readonly graphApi: GraphApiService,
    private readonly graphUtil: GraphUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  healthStatus: boolean | undefined;
  private unsubscribe = new Subject<void>();
  isHovered: boolean | undefined;
  statusText: string | undefined;

  ngOnInit(): void {
    try {
      interval(60000)
        .pipe(takeUntil(this.unsubscribe))
        .subscribe(() => {
          this.getHealthCheck();
        });
    } catch (error: any) {
      this.healthStatus = false;
    }

    // Initial health check
    this.getHealthCheck();

    this.filteredOptions = this.searchControl.valueChanges.pipe(
      startWith(undefined),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap((searchTerm) => {
        if (typeof searchTerm === 'string' && searchTerm.length >= 3) {
          return this.graphApi.doTypeaheadSearch(searchTerm);
        }
        return of({
          meta: {
            total: 0,
          },
          data: [],
        });
      }),
    );
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  getHealthCheck(): any {
    try {
      this.healthService
        .healthCheck()
        .pipe(
          catchError((error: any) => {
            this.healthStatus = false;
            throw error;
          }),
        )
        .subscribe((data: any) => {
          if (data === null) {
            this.healthStatus = false;
          } else {
            this.healthStatus = data.status === 'ok';
          }
        });
    } catch (error: any) {
      this.healthStatus = false;
    }
  }

  showStatusText(isHovered: boolean) {
    this.isHovered = isHovered;
    this.statusText = this.healthStatus ? 'Online' : 'Offline';
  }

  showRolesDialog() {
    this.dialog.open(RolesDialogComponent, {
      width: '400px',
    });
  }

  displayFn(vertex: GraphTypeaheadData): string {
    if (vertex) {
      return vertex.name;
    } else {
      return '';
    }
  }

  onTypeaheadOptionClick(option: GraphTypeaheadData) {
    this.graphUtil.openInGraph(option.id, 'vertex');
    this.searchControl?.reset();
  }

  openSidebar() {
    this.sidebarClick.emit(true);
  }

  logout() {
    window.location.href = `${environment.apiUrl}/auth/logout`;
  }
}
