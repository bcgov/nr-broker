import { Component, Output } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import {
  ChartClickTarget,
  CollectionConfig,
  CollectionConfigMap,
  GraphData,
  GraphDataConfig,
} from './graph.types';
import { GraphApiService } from './graph-api.service';
import { VertexDialogComponent } from './vertex-dialog/vertex-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent {
  @Output() data!: Observable<GraphDataConfig>;
  @Output() selected: ChartClickTarget | undefined = undefined;

  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();
  private latestConfig: CollectionConfig[] | null = null;

  constructor(private graphApi: GraphApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() =>
        combineLatest([this.graphApi.getData(), this.graphApi.getConfig()]),
      ),
      map(([data, config]: [GraphData, CollectionConfig[]]) => {
        // console.log(data);
        // console.log(config);
        this.latestConfig = config;
        data.idToVertex = data.vertices.reduce(
          (previousValue: any, currentValue) => {
            previousValue[currentValue.id] = currentValue;
            return previousValue;
          },
          {},
        );
        data.idToEdge = data.edges.reduce(
          (previousValue: any, currentValue) => {
            previousValue[currentValue.id] = currentValue;
            return previousValue;
          },
          {},
        );
        const configMap: CollectionConfigMap = config.reduce(
          (previousValue, currentValue) => {
            previousValue[currentValue.collection] = currentValue;
            return previousValue;
          },
          {} as CollectionConfigMap,
        );

        return {
          data,
          config: configMap,
        };
      }),
      tap(() => {
        this.onSelected(undefined);
      }),
      shareReplay(1),
    );
  }

  onSelected(event: ChartClickTarget | undefined): void {
    this.selected = event;
  }

  addVertex() {
    console.log('addVertex');
    this.dialog
      .open(VertexDialogComponent, {
        height: '700px',
        width: '600px',
        data: {
          config: this.latestConfig,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          this.refreshData();
        }
      });
  }

  refreshData() {
    this.triggerRefresh.next(true);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
}
