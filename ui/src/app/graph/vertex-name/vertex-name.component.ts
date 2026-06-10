import { Component, input, ChangeDetectionStrategy } from '@angular/core';

import { GraphDataVertex } from '../../service/graph.types';
import { GraphTypeaheadData } from '../../service/graph/dto/graph-typeahead-result.dto';

@Component({
  selector: 'app-vertex-name',
  template: `@if (vertex().parentName) {
      {{ vertex().parentName }} &gt;
    }
    {{ vertex().name }}`,
  styles: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
})
export class VertexNameComponent {
  readonly vertex = input.required<GraphDataVertex | GraphTypeaheadData>();
}
