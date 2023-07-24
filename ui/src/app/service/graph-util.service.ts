import { Injectable } from '@angular/core';
import { GraphDataResponseEdgeDto } from './dto/graph-data.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphUtilService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  snakecase(str: string) {
    return str.replace(
      /[A-Z]/g,
      (letter: string) => `-${letter.toLowerCase()}`,
    );
  }

  edgeToMapString(e: Pick<GraphDataResponseEdgeDto, 'is' | 'it' | 'name'>) {
    return `${e.is}>${e.it}:${e.name}`;
  }
}
