import { Pipe, PipeTransform } from '@angular/core';
import { CollectionEdgeConfig } from '../service/persistence/dto/collection-config.dto';
import { TitleCasePipe } from '@angular/common';

@Pipe({
  name: 'edgetitleinbound',
})
export class EdgetitleinboundPipe implements PipeTransform {
  private titleCase = new TitleCasePipe();

  transform(edge: CollectionEdgeConfig | undefined): unknown {
    if (!edge) {
      return '';
    }
    return (
      edge.titleInbound ?? edge.title ?? this.titleCase.transform(edge.name)
    );
  }
}
