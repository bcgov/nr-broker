import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity } from './catalog-entity';
import { CatalogComponentInstance } from './catalog-component-instance';
import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A Backstage `Component` entity declared in a catalog file.
 */
export class CatalogComponent extends CatalogEntity {
  static readonly kind = 'Component';

  constructor(
    path: string,
    readonly name: string,
    readonly system?: string,
    readonly title?: string,
    readonly description?: string,
    readonly lifecycle?: string,
    readonly type?: string,
    readonly tags?: string[],
    readonly owner?: string,
    readonly instances?: CatalogComponentInstance[],
    readonly subcomponentOf?: string,
    readonly dependsOn?: string[],
  ) {
    super(path);
  }

  static fromJson(
    path: string,
    json: any,
    catalogUtil: CatalogUtil,
  ): CatalogComponent {
    const name = catalogUtil.asString(json.metadata?.name);
    if (!name) {
      throw new CatalogEntityParseError(
        `Catalog component in ${path} has no name`,
      );
    }
    const subcomponentOf = catalogUtil.asString(json.spec?.subcomponentOf);
    if (json.spec?.subcomponentOf !== undefined && !subcomponentOf?.trim()) {
      throw new CatalogEntityParseError(
        `Catalog component ${name} in ${path} has an invalid spec.subcomponentOf; use a non-empty Component reference`,
      );
    }
    const dependsOn = catalogUtil.asStringArray(json.spec?.dependsOn);
    if (
      json.spec?.dependsOn !== undefined &&
      (!dependsOn || dependsOn.some((reference) => reference.trim() === ''))
    ) {
      throw new CatalogEntityParseError(
        `Catalog component ${name} in ${path} has an invalid spec.dependsOn; use an array of non-empty entity references`,
      );
    }
    return new CatalogComponent(
      path,
      name,
      catalogUtil.asString(json.spec?.system),
      catalogUtil.asString(json.metadata?.title),
      catalogUtil.asString(json.metadata?.description),
      catalogUtil.asString(json.spec?.lifecycle),
      catalogUtil.asString(json.spec?.type),
      catalogUtil.asStringArray(json.metadata?.tags),
      catalogUtil.asString(json.spec?.owner),
      CatalogComponentInstance.parseLinks(
        path,
        name,
        json.metadata?.links,
      ),
      subcomponentOf,
      dependsOn,
    );
  }
}
