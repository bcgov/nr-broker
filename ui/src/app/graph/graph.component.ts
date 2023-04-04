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

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent {
  @Output() data!: Observable<any>;
  @Output() selected = undefined;

  triggerRefresh = new BehaviorSubject(true);
  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.data = this.triggerRefresh.pipe(
      takeUntil(this.ngUnsubscribe),
      switchMap(() => this.getData()),
      map((data: any) => {
        data.idToNode = data.nodes.reduce(
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
    return this.http.get<any>('http://localhost:3000/v1/graph/data', {
      responseType: 'json',
    });
  }

  onSelected(event: any): void {
    this.selected = event;
  }

  refreshData() {
    this.triggerRefresh.next(true);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }
}
