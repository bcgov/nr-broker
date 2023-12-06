import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GraphDataResponseEdgeDto } from './dto/graph-data.dto';
import { CollectionConfigResponseDto } from './dto/collection-config-rest.dto';
import { CollectionConfigMap, CollectionEdgeConfigMap } from './graph.types';

@Injectable({
  providedIn: 'root',
})
export class GraphUtilService {
  constructor(private readonly router: Router) {}

  configArrToMap(
    configArr: CollectionConfigResponseDto[],
  ): CollectionConfigMap {
    return configArr.reduce((previousValue, currentValue) => {
      previousValue[currentValue.collection] = currentValue;
      return previousValue;
    }, {} as CollectionConfigMap);
  }

  configArrToSrcTarMap(
    configArr: CollectionConfigResponseDto[],
    configMap: CollectionConfigMap,
  ): CollectionEdgeConfigMap {
    return configArr.reduce((previousValue, currentValue, currentIndex) => {
      for (const edge of currentValue.edges) {
        previousValue[
          `${currentIndex}>${configMap[edge.collection].index}:${edge.name}`
        ] = edge;
      }
      return previousValue;
    }, {} as CollectionEdgeConfigMap);
  }

  edgeToMapString(e: Pick<GraphDataResponseEdgeDto, 'is' | 'it' | 'name'>) {
    return `${e.is}>${e.it}:${e.name}`;
  }

  snakecase(str: string) {
    return str.replace(
      /[A-Z]/g,
      (letter: string) => `-${letter.toLowerCase()}`,
    );
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
