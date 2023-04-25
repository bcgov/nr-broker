import { Component, Input } from '@angular/core';
import { GraphDataVertex } from '../graph.types';

@Component({
  selector: 'app-vertex-name',
  template: `<ng-container *ngIf="vertex"
    ><ng-container *ngIf="vertex.parentName"
      >{{ vertex.parentName }} &gt; </ng-container
    >{{ vertex.name }}</ng-container
  >`,
  styles: [],
})
export class VertexNameComponent {
  @Input() vertex: GraphDataVertex | undefined;
}
