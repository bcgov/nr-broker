import { Component, Input } from '@angular/core';

import { GraphDataVertex } from '../../service/graph.types';

@Component({
  selector: 'app-vertex-name',
  template: `@if (vertex) {
    @if (vertex.parentName) {
      {{ vertex.parentName }} &gt;
    }
    {{ vertex.name }}
  }`,
  styles: [],
  standalone: true,
  imports: [],
})
export class VertexNameComponent {
  @Input() vertex: GraphDataVertex | undefined;
}
