import { Injectable } from '@angular/core';
import {
  CollectionDtoRestUnion,
  CollectionNames,
} from './dto/collection-dto-union.type';
import { VertexRestDto } from './dto/vertex-rest.dto';
import { Router } from '@angular/router';
import { CollectionApiService } from './collection-api.service';

@Injectable({
  providedIn: 'root',
})
export class CollectionUtilService {
  constructor(
    private readonly router: Router,
    private readonly collectionApi: CollectionApiService,
  ) {}

  openInBrowser(collection: CollectionNames, id: string) {
    this.router.navigate([`/browse/${collection}/${id}`]);
  }

  openInBrowserByVertexId(collection: CollectionNames, vertexId: string) {
    this.collectionApi
      .searchCollection(collection, {
        vertexId,
        offset: 0,
        limit: 1,
      })
      .subscribe((result) => {
        if (result) {
          this.router.navigate(
            ['/browse', collection, result.data[0].collection.id, { index: 0 }],
            {
              replaceUrl: true,
            },
          );
        }
      });
  }

  openServicePackage(serviceId: string, packageId: string) {
    console.log(serviceId, packageId);
    this.router.navigate([
      `/browse/service/${serviceId}`,
      { build: packageId, index: 3 },
    ]);
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
  narrowCollectionType<T extends keyof CollectionDtoRestUnion>(
    name: T,
    vertex: VertexRestDto,
    collection: CollectionDtoRestUnion[keyof CollectionDtoRestUnion],
  ) {
    if (vertex.collection === name && collection.vertex === vertex.id) {
      return collection as CollectionDtoRestUnion[T];
    }
    // Calling code should ALWAYS evaluate name and collection name's equality
    throw new Error();
  }
}
