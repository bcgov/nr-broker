import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { BehaviorSubject, map, Observable, withLatestFrom } from 'rxjs';

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
  @Output() selected = new EventEmitter<any>();
  propDisplayedColumns: string[] = ['key', 'value'];
  targetSubject = new BehaviorSubject<any>(true);
  latestData: any;

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
    this.data.subscribe((data) => {
      this.latestData = data;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log(changes);
    if (changes['target']) {
      this.target = changes['target'].currentValue;
      this.targetSubject.next(this.target);
    }
  }

  gatherConnections(target: any, data: any, direction: string): Array<any> {
    if (target.dataType === 'vertex') {
      return data.links
        .filter((link: any) => link[direction] === target.id)
        .map((edge: any) => ({
          ...edge,
          connectedVertex:
            data.idToNode[edge[direction === 'source' ? 'target' : 'source']],
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
          connectedVertex: data.idToNode[target[direction]],
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
    console.log(id);
    return;
  }

  selectVertex(id: string) {
    console.log(id);
    console.log(this.latestData);
    if (this.latestData && this.latestData.idToNode[id]) {
      const node = this.latestData.idToNode[id];
      this.selected.emit({
        id,
        dataType: 'vertex',
        type: node.type,
        name: node.name,
        prop: node.prop,
      });
    }
  }
}
