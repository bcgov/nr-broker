import { Component, Output, ViewChild } from '@angular/core';
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
  ChartClickTargetVertex,
  CollectionConfig,
  CollectionConfigMap,
  GraphData,
  GraphDataConfig,
} from './graph.types';
import { GraphApiService } from './graph-api.service';
import { VertexDialogComponent } from './vertex-dialog/vertex-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { EchartsComponent } from './echarts/echarts.component';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent {
  @Output() data!: Observable<GraphDataConfig>;
  @Output() selected: ChartClickTarget | undefined = undefined;
  @ViewChild(EchartsComponent)
  private echartsComponent!: EchartsComponent;

  private triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();
  private latestConfig: CollectionConfigMap | null = null;
  private latestData: GraphData | null = null;

  constructor(private graphApi: GraphApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() =>
        combineLatest([this.graphApi.getData(), this.graphApi.getConfig()]),
      ),
      map(([data, configArr]: [GraphData, CollectionConfig[]]) => {
        // console.log(data);
        // console.log(config);
        const configMap: CollectionConfigMap = configArr.reduce(
          (previousValue, currentValue) => {
            previousValue[currentValue.collection] = currentValue;
            return previousValue;
          },
          {} as CollectionConfigMap,
        );
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
        for (const edge of data.edges) {
          const targetVertex = data.idToVertex[edge.target];
          const parentEdgeName =
            configMap[targetVertex.collection]?.parent?.edgeName;
          if (parentEdgeName && edge.name === parentEdgeName) {
            const sourceVertex = data.idToVertex[edge.source];
            targetVertex.parentName = sourceVertex.name;
          }
        }
        this.latestConfig = configMap;
        this.latestData = data;

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
    if (event?.type === 'vertex') {
      this.echartsComponent.echartsInstance.dispatchAction({
        type: 'select',

        // Find  by index or id or name.
        // Can be an array to find multiple components.
        seriesIndex: 0,

        // data index; could assign by name attribute when not defined
        dataIndex: this.latestData?.vertices.findIndex(
          (vertex) =>
            event.data.id === vertex.id &&
            event.data.category === vertex.category,
        ),
      });
    }
  }

  onGraphSelected(event: any): void {
    if (event?.type === 'edge') {
      this.selected = event;
    }
    if (event?.type === 'vertex') {
      // console.log(event);
      this.selected = {
        type: 'vertex',
        data: this.latestData?.vertices.find(
          (vertex) =>
            vertex.id === event.data.name &&
            vertex.category === event.data.category,
        ),
      } as ChartClickTargetVertex;
    }
  }

  addVertex() {
    this.dialog
      .open(VertexDialogComponent, {
        width: '500px',
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
