import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity } from './catalog-entity';

/**
 * A Backstage `Location` entity. Targets are resolved relative to the file
 * that declares them. Only relative paths inside the repository are kept.
 */
export class CatalogLocationEntity extends CatalogEntity {
  static readonly kind = 'Location';

  constructor(
    path: string,
    readonly targets: string[],
  ) {
    super(path);
  }

  static fromJson(
    path: string,
    json: any,
    catalogUtil: CatalogUtil,
  ): CatalogLocationEntity {
    const rawTargets: unknown[] = [
      json.spec?.target,
      ...(Array.isArray(json.spec?.targets) ? json.spec.targets : []),
    ];
    return new CatalogLocationEntity(
      path,
      rawTargets
        .map((target) => catalogUtil.resolveLocationTarget(path, target))
        .filter((target): target is string => target !== null),
    );
  }
}
