import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity } from './catalog-entity';
import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A Backstage `System` entity declared in a catalog file.
 */
export class CatalogSystem extends CatalogEntity {
  static readonly kind = 'System';

  constructor(
    path: string,
    readonly name: string,
    readonly title?: string,
    readonly description?: string,
    readonly tags?: string[],
    readonly domain?: string,
    readonly type?: string,
  ) {
    super(path);
  }

  static fromJson(
    path: string,
    json: any,
    catalogUtil: CatalogUtil,
  ): CatalogSystem {
    const name = catalogUtil.asString(json.metadata?.name)?.trim();
    if (!name) {
      throw new CatalogEntityParseError(
        `Catalog system in ${path} has no name`,
      );
    }
    return new CatalogSystem(
      path,
      name,
      catalogUtil.asString(json.metadata?.title),
      catalogUtil.asString(json.metadata?.description),
      catalogUtil.asStringArray(json.metadata?.tags),
      catalogUtil.asString(json.spec?.domain),
      catalogUtil.asString(json.spec?.type),
    );
  }
}
