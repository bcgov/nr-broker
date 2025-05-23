import { Pipe, PipeTransform } from '@angular/core';
import { CollectionEdgeConfig } from '../service/persistence/dto/collection-config.dto';
import { TitleCasePipe } from '@angular/common';

@Pipe({
  name: 'edgeinboundtitle',
})
export class EdgeinboundtitlePipe implements PipeTransform {
  private titleCase = new TitleCasePipe();

  transform(edge: CollectionEdgeConfig): unknown {
    return (
      edge.titleInbound || edge.title || this.titleCase.transform(edge.name)
    );
  }
}
