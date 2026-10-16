import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity } from './catalog-entity';
import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A Backstage `Component` entity declared in a catalog file.
 */
export class CatalogComponentEntity extends CatalogEntity {
  static readonly kind = 'Component';

  constructor(
    path: string,
    readonly name: string,
    readonly system?: string,
    readonly title?: string,
    readonly description?: string,
    readonly lifecycle?: string,
    readonly type?: string,
  ) {
    super(path);
  }

  static fromJson(
    path: string,
    json: any,
    catalogUtil: CatalogUtil,
  ): CatalogComponentEntity {
    const name = catalogUtil.asString(json.metadata?.name);
    if (!name) {
      throw new CatalogEntityParseError(
        `Catalog component in ${path} has no name`,
      );
    }
    return new CatalogComponentEntity(
      path,
      name,
      catalogUtil.asString(json.spec?.system),
      catalogUtil.asString(json.metadata?.title),
      catalogUtil.asString(json.metadata?.description),
      catalogUtil.asString(json.spec?.lifecycle),
      catalogUtil.asString(json.spec?.type),
    );
  }
}
