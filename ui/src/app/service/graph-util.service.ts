import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GraphDataResponseEdgeDto } from './dto/graph-data.dto';
import { CollectionConfigResponseDto } from './dto/collection-config-rest.dto';

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

  extractVertexData(config: CollectionConfigResponseDto, data: any) {
    const vertexData = {
      ...data,
    };
    for (const fieldKey of Object.keys(config.fields)) {
      if (config.fields[fieldKey].type === 'embeddedDocArray') {
        continue;
      }
      const val =
        typeof vertexData[fieldKey] === 'string'
          ? vertexData[fieldKey].trim()
          : vertexData[fieldKey];
      if (config.fields[fieldKey].type === 'json') {
        if (val !== '') {
          vertexData[fieldKey] = JSON.parse(val);
        } else {
          delete vertexData[fieldKey];
        }
      }
      if (config.fields[fieldKey].type === 'stringArray') {
        vertexData[fieldKey] = val.split(',').map((s: string) => s.trim());
      }
      if (!config.fields[fieldKey].required && val === '') {
        delete vertexData[fieldKey];
      }
    }
    return vertexData;
  }
}
