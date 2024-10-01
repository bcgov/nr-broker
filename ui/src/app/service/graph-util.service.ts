import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionConfigRestDto } from './dto/collection-config-rest.dto';
import { CollectionConfigMap, CollectionEdgeConfigMap } from './graph.types';
import { EdgeRestDto } from './dto/edge-rest.dto';

@Injectable({
  providedIn: 'root',
})
export class GraphUtilService {
  constructor(private readonly router: Router) {}

  static configArrToMap(
    configArr: CollectionConfigRestDto[],
  ): CollectionConfigMap {
    return configArr.reduce((previousValue, currentValue) => {
      previousValue[currentValue.collection] = currentValue;
      return previousValue;
    }, {} as CollectionConfigMap);
  }

  static configArrToSrcTarMap(
    configArr: CollectionConfigRestDto[],
    configMap: CollectionConfigMap,
  ): CollectionEdgeConfigMap {
    return configArr.reduce((previousValue, currentValue) => {
      for (const edge of currentValue.edges) {
        previousValue[
          `${currentValue.index}>${configMap[edge.collection].index}:${edge.name}`
        ] = edge;
      }
      return previousValue;
    }, {} as CollectionEdgeConfigMap);
  }

  edgeToMapString(e: Pick<EdgeRestDto, 'is' | 'it' | 'name'>) {
    return `${e.is}>${e.it}:${e.name}`;
  }

  snakecase(str: string) {
    if (!str) {
      return str;
    }
    return str.replace(
      /[A-Z]/g,
      (letter: string) => `-${letter.toLowerCase()}`,
    );
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

  extractVertexData(config: CollectionConfigRestDto, data: any) {
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
        vertexData[fieldKey] = val.split(',').map((s: string) => s.trim());
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
