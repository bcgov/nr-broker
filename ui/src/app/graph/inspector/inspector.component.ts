import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  BehaviorSubject,
  map,
  Observable,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';

@Component({
  selector: 'app-inspector',
  templateUrl: './inspector.component.html',
  styleUrls: ['./inspector.component.scss'],
})
export class InspectorComponent implements OnChanges {
  @Input() data!: Observable<any>;
  @Input() target!: any;
  @Output() inboundConnections!: Observable<any>;
  @Output() outboundConnections!: Observable<any>;
  @Output() collectionData!: Observable<any>;
  @Output() selected = new EventEmitter<any>();
  propDisplayedColumns: string[] = ['key', 'value'];
  targetSubject = new BehaviorSubject<any>(true);
  latestData: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.inboundConnections = this.targetSubject.pipe(
      withLatestFrom(this.data),
      map(([target, data]) => {
        return this.gatherConnections(target, data, 'target');
      }),
    );
    this.outboundConnections = this.targetSubject.pipe(
      withLatestFrom(this.data),
      map(([target, data]) => {
        return this.gatherConnections(target, data, 'source');
      }),
    );
    this.collectionData = this.targetSubject.pipe(
      switchMap((target: any) => {
        console.log(target);
        return this.getCollectionData(target);
      }),
    );
    this.collectionData.subscribe((data) => {
      console.log(data);
    });
    this.data.subscribe((data) => {
      this.latestData = data;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['target']) {
      this.target = changes['target'].currentValue;
      this.targetSubject.next(this.target);
    }
  }

  gatherConnections(target: any, data: any, direction: string): Array<any> {
    if (target.dataType === 'vertex') {
      return data.edges
        .filter((edge: any) => edge[direction] === target.id)
        .map((edge: any) => ({
          ...edge,
          connectedVertex:
            data.idToVertex[edge[direction === 'source' ? 'target' : 'source']],
        }))
        .reduce((previousValue: any, currentValue: any) => {
          if (!previousValue[currentValue.label]) {
            previousValue[currentValue.label] = [];
          }
          previousValue[currentValue.label].push(currentValue);
          return previousValue;
        }, {});
    } else if (target.dataType === 'edge') {
      return [
        {
          connectedVertex: data.idToVertex[target[direction]],
        },
      ];
    } else {
      return [];
    }
  }

  getTargetId() {
    if (this.target) {
      return this.target.id;
    }
    return '';
  }

  getEdgeSourceId() {
    if (this.target) {
      return this.target.source;
    }
    return '';
  }

  getEdgeTargetId() {
    if (this.target) {
      return this.target.target;
    }
    return '';
  }

  selectEdge(id: string) {
    // console.log(id);
    if (this.latestData && this.latestData.idToEdge[id]) {
      const edge = this.latestData.idToEdge[id];
      this.selected.emit({
        id,
        dataType: 'edge',
        label: edge.label,
        prop: edge.prop,
        source: edge.source,
        target: edge.target,
      });
    }
    return;
  }

  selectVertex(id: string) {
    // console.log(id);
    if (this.latestData && this.latestData.idToVertex[id]) {
      const vertex = this.latestData.idToVertex[id];
      this.selected.emit({
        id,
        dataType: 'vertex',
        type: vertex.type,
        name: vertex.name,
        prop: vertex.prop,
      });
    }
  }

  getCollectionData(target: any) {
    console.log(target);
    if (!target || target.dataType !== 'vertex') {
      return of({});
    }

    return this.http.get<any>(
      `http://localhost:3000/v1/graph/${target.type.replace(
        /[A-Z]/g,
        (letter: string) => `-${letter.toLowerCase()}`,
      )}?vertex=${target.id}`,
      {
        responseType: 'json',
      },
    );
  }
}
