import { Document, parseAllDocuments } from 'yaml';
import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A catalog entity class that can be built from a YAML document of its kind.
 */
export interface CatalogEntityType<T extends CatalogEntity> {
  readonly kind: string;
  fromJson(path: string, json: any, catalogUtil: CatalogUtil): T;
}

/**
 * Base class for Backstage entities declared in a catalog file.
 */
export abstract class CatalogEntity {
  constructor(readonly path: string) {}

  /**
   * Parse every YAML document in a catalog file into an entity of one of the
   * given types. Documents of other kinds are ignored. Invalid documents are
   * reported through `onError` and skipped.
   */
  static parseCatalogEntities<T extends CatalogEntity>(
    path: string,
    content: string,
    types: CatalogEntityType<T>[],
    catalogUtil: CatalogUtil,
    onError?: (error: CatalogEntityParseError) => void,
  ): T[] {
    const entities: T[] = [];
    for (const doc of parseAllDocuments(content)) {
      try {
        const entity = CatalogEntity.fromDocument(
          path,
          doc as Document,
          types,
          catalogUtil,
        );
        if (entity) {
          entities.push(entity);
        }
      } catch (error) {
        if (!(error instanceof CatalogEntityParseError)) {
          throw error;
        }
        onError?.(error);
      }
    }
    return entities;
  }

  private static fromDocument<T extends CatalogEntity>(
    path: string,
    doc: Document,
    types: CatalogEntityType<T>[],
    catalogUtil: CatalogUtil,
  ): T | null {
    if (doc.errors.length > 0) {
      throw new CatalogEntityParseError(
        `Unable to parse catalog document in ${path}`,
      );
    }
    const json = doc.toJS();
    if (!json || typeof json !== 'object') {
      return null;
    }
    const type = types.find((candidate) => candidate.kind === json.kind);
    return type ? type.fromJson(path, json, catalogUtil) : null;
  }
}
