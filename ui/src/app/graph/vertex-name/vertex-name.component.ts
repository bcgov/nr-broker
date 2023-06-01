import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { GraphDataVertex } from '../../service/graph.types';

@Component({
  selector: 'app-vertex-name',
  template: `<ng-container *ngIf="vertex"
    ><ng-container *ngIf="vertex.parentName"
      >{{ vertex.parentName }} &gt; </ng-container
    >{{ vertex.name }}</ng-container
  >`,
  styles: [],
  standalone: true,
  imports: [NgIf],
})
export class VertexNameComponent {
  @Input() vertex: GraphDataVertex | undefined;
}
