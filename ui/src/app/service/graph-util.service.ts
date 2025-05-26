import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { CollectionConfigDto } from './persistence/dto/collection-config.dto';
import { EdgeDto } from './persistence/dto/edge.dto';
import {
  CollectionConfigNameRecord,
  CollectionConfigStringRecord,
} from './graph.types';

@Injectable({
  providedIn: 'root',
})
export class GraphUtilService {
  constructor(private readonly router: Router) {}

  static configArrToSrcTarRecord(
    configArr: CollectionConfigDto[],
    configRecord: CollectionConfigNameRecord,
  ): CollectionConfigStringRecord {
    return configArr.reduce((previousValue, currentValue) => {
      for (const edge of currentValue.edges) {
        previousValue[
          `${currentValue.index}>${configRecord[edge.collection].index}:${edge.name}`
        ] = edge;
      }
      return previousValue;
    }, {} as CollectionConfigStringRecord);
  }

  edgeToMapString(e: Pick<EdgeDto, 'is' | 'it' | 'name'>) {
    return `${e.is}>${e.it}:${e.name}`;
  }

  isGraphOpen() {
    return this.router.routerState.snapshot.url.startsWith('/graph');
  }

  openInGraph(id: string, type: 'edge' | 'vertex', replaceUrl = true) {
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
        replaceUrl,
      },
    );
  }

  extractVertexData(config: CollectionConfigDto, data: any) {
    const vertexData = {
      ...data,
    };
    for (const fieldKey of Object.keys(config.fields)) {
      if (
        config.fields[fieldKey].type === 'embeddedDocArray' ||
        config.fields[fieldKey].type === 'embeddedDoc'
      ) {
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
        if (val.trim() === '') {
          vertexData[fieldKey] = [];
        } else {
          vertexData[fieldKey] = val.split(',').map((s: string) => s.trim());
        }
      }
      if (config.fields[fieldKey].type === 'number') {
        vertexData[fieldKey] = Number.parseInt(val);
      }
      if (!config.fields[fieldKey].required && val === '') {
        delete vertexData[fieldKey];
      }
    }
    return vertexData;
  }
}
