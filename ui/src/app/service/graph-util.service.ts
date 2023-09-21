import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GraphDataResponseEdgeDto } from './dto/graph-data.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphUtilService {
  constructor(private readonly router: Router) {}

  snakecase(str: string) {
    return str.replace(
      /[A-Z]/g,
      (letter: string) => `-${letter.toLowerCase()}`,
    );
  }

  edgeToMapString(e: Pick<GraphDataResponseEdgeDto, 'is' | 'it' | 'name'>) {
    return `${e.is}>${e.it}:${e.name}`;
  }

  openInGraph(id: string, type: 'edge' | 'vertex') {
    this.router.navigate(
      [
        '/graph',
        {
          selected: JSON.stringify({
            id,
            type,
          }),
        },
      ],
      {
        replaceUrl: true,
      },
    );
  }
}
