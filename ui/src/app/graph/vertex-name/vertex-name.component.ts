import { Component, Input } from '@angular/core';

import { GraphDataVertex } from '../../service/graph.types';
import { GraphTypeaheadData } from '../../service/graph/dto/graph-typeahead-result.dto';

@Component({
  selector: 'app-vertex-name',
  template: `@if (vertex) {
    @if (vertex.parentName) {
      {{ vertex.parentName }} &gt;
    }
    {{ vertex.name }}
  }`,
  styles: [],
  imports: [],
})
export class VertexNameComponent {
  @Input() vertex: GraphDataVertex | GraphTypeaheadData | undefined;
}
