import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  CollectionDtoUnion,
  CollectionNames,
} from './persistence/dto/collection-dto-union.type';
import { VertexDto } from './persistence/dto/vertex.dto';
import { CollectionApiService } from './collection-api.service';
import { CollectionConfigDto } from './persistence/dto/collection-config.dto';
import { CONFIG_RECORD } from '../app-initialize.factory';
import { CollectionConfigNameRecord } from './graph.types';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CollectionUtilService {
  private readonly router = inject(Router);
  private readonly collectionApi = inject(CollectionApiService);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  static configArrToMap(
    configArr: CollectionConfigDto[],
  ): CollectionConfigNameRecord {
    return configArr.reduce((previousValue, currentValue) => {
      previousValue[currentValue.collection] = currentValue;
      return previousValue;
    }, {} as CollectionConfigNameRecord);
  }

  getCollectionConfigByName(collection: CollectionNames) {
    return this.configRecord[collection];
  }

  openInBrowser(collection: CollectionNames, id: string) {
    this.router.navigate([`/browse/${collection}/${id}`]);
  }

  getCollectionByVertexId<T extends CollectionNames>(
    collection: T,
    vertexId: string,
  ) {
    return this.collectionApi
      .searchCollection(collection, {
        vertexId,
        offset: 0,
        limit: 1,
      })
      .pipe(
        // Map to the collection id
        map((result) => {
          if (result && result.meta.total > 0) {
            return result.data[0].collection.id;
          } else {
            throw new Error('Vertex not found');
          }
        }),
      );
  }

  openInBrowserByVertexId(
    collection: CollectionNames,
    vertexId: string,
    replaceUrl = false,
    subCommands: any[] = [],

  ) {
    this.getCollectionByVertexId(collection, vertexId)
      .subscribe((collectionId) => {
        this.router.navigate(
          ['/browse', collection, collectionId, ...subCommands],
          {
            replaceUrl,
          },
        );
      });
  }

  openUserInBrowserByGuid(guid: string) {
    this.collectionApi
      .searchCollection('user', {
        q: guid,
        offset: 0,
        limit: 1,
      })
      .subscribe((result) => {
        if (result && result.meta.total > 0) {
          this.router.navigate(
            ['/browse', 'user', result.data[0].collection.id, { index: 0 }],
            {
              replaceUrl: true,
            },
          );
        } else {
          throw new Error('User not found');
        }
      });
  }

  openServiceBuilds(serviceId: string) {
    this.router.navigate([`/browse/service/${serviceId}/build`]);
  }

  openServicePackage(serviceId: string, packageId: string) {
    this.router.navigate([`/browse/service/${serviceId}/build/${packageId}`]);
  }

  openServiceInstances(serviceId: string) {
    this.router.navigate([`/browse/service/${serviceId}/instances`]);
  }

  openServiceHistory(serviceId: string) {
    this.router.navigate([`/browse/service/${serviceId}/history`]);
  }

  openAccessToken(brokerAccountId: string) {
    this.router.navigate([`/browse/brokerAccount/${brokerAccountId}/token`]);
  }
  openBrokerAccountHistory(brokerAccountId: string) {
    this.router.navigate([`/browse/brokerAccount/${brokerAccountId}/history`]);
  }

  /**
   * Narrows a collection union to a specific collection type based on name.
   * Calling code should evaluate if vertex if and collection vertex are a
   * equal to name before calling. Will throw error if collection does not match.
   * @param name The name of the collection type to narrow the collection to
   * @param vertex The vertex to use to narrow the collection.
   * @param collection The collection to narrow.
   * @returns The narrowed collection
   */
  narrowCollectionType<T extends keyof CollectionDtoUnion>(
    name: T,
    vertex: VertexDto,
    collection: CollectionDtoUnion[T],
  ) {
    if (vertex.collection === name && collection.vertex === vertex.id) {
      return collection as CollectionDtoUnion[T];
    }
    // Calling code should ALWAYS evaluate name and collection name's equality
    throw new Error();
  }
}
