import { CATALOG_ANNOTATION_INSTANCES } from '../constants';
import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity } from './catalog-entity';
import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A service instance declared in the instances annotation of a component.
 */
export interface CatalogInstance {
  env: string;
  name: string;
  url?: string;
}

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
    readonly tags?: string[],
    readonly owner?: string,
    readonly instances?: CatalogInstance[],
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
      catalogUtil.asStringArray(json.metadata?.tags),
      catalogUtil.asString(json.spec?.owner),
      CatalogComponentEntity.parseInstances(
        path,
        name,
        json.metadata?.annotations?.[CATALOG_ANNOTATION_INSTANCES],
      ),
    );
  }

  /**
   * Parse the instances annotation: a JSON array of `{ env, name?, url? }`.
   * The name defaults to the environment. A missing annotation returns
   * undefined so existing instances are left alone.
   */
  private static parseInstances(
    path: string,
    component: string,
    value: unknown,
  ): CatalogInstance[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const fail = (reason: string) =>
      new CatalogEntityParseError(
        `Catalog component ${component} in ${path} has an invalid ${CATALOG_ANNOTATION_INSTANCES} annotation: ${reason}`,
      );
    if (typeof value !== 'string') {
      throw fail('the value must be a JSON string');
    }
    let entries: unknown;
    try {
      entries = JSON.parse(value);
    } catch {
      throw fail('the value is not valid JSON');
    }
    if (!Array.isArray(entries)) {
      throw fail('the value must be a JSON array');
    }

    const instances: CatalogInstance[] = [];
    const names = new Set<string>();
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw fail('each entry must be an object');
      }
      const { env, name, url } = entry as Record<string, unknown>;
      if (typeof env !== 'string' || env.trim() === '') {
        throw fail('each entry must have an env');
      }
      if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
        throw fail('name must be a non-empty string');
      }
      if (url !== undefined && !CatalogComponentEntity.isHttpUrl(url)) {
        throw fail('url must be an http or https URL');
      }
      const instanceName = ((name as string | undefined) ?? env).trim();
      if (names.has(instanceName)) {
        throw fail(
          `the instance name ${instanceName} is used more than once. Give each instance in the same environment a distinct name.`,
        );
      }
      names.add(instanceName);
      instances.push({
        env: env.trim(),
        name: instanceName,
        ...(url !== undefined ? { url: url as string } : {}),
      });
    }
    return instances;
  }

  private static isHttpUrl(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
