import { HttpClient } from '@angular/common/http';
import { Component, Output } from '@angular/core';
import {
  BehaviorSubject,
  map,
  Observable,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { ChartClickTarget, GraphData } from './graph.types';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent {
  @Output() data!: Observable<GraphData>;
  @Output() selected: ChartClickTarget | undefined = undefined;

  triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() => this.getData()),
      map((data: any) => {
        data.idToVertex = data.vertices.reduce(
          (previousValue: any, currentValue: any) => {
            previousValue[currentValue.id] = currentValue;
            return previousValue;
          },
          {},
        );
        return data;
      }),
      shareReplay(1),
    );
  }

  getData() {
    return this.http.get<any>(`${environment.apiUrl}/v1/graph/data`, {
      responseType: 'json',
    });
  }

  onSelected(event: ChartClickTarget): void {
    this.selected = event;
  }

  addVertex() {
    console.log('addVertex');
  }

  refreshData() {
    this.triggerRefresh.next(true);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
}
