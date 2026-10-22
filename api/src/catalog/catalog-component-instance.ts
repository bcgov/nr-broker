import { CATALOG_ANNOTATION_INSTANCES } from '../constants';
import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A service instance declared in the instances annotation of a component.
 */
export class CatalogComponentInstance {
  readonly env: string;
  readonly name: string;
  readonly url?: string;

  constructor(env: string, name: string, url?: string) {
    this.env = env;
    this.name = name;
    if (url !== undefined) {
      this.url = url;
    }
  }

  static parseAnnotation(
    path: string,
    component: string,
    value: unknown,
  ): CatalogComponentInstance[] | undefined {
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

    const instances: CatalogComponentInstance[] = [];
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
      if (url !== undefined && !CatalogComponentInstance.isHttpUrl(url)) {
        throw fail('url must be an http or https URL');
      }
      const instanceName = ((name as string | undefined) ?? env).trim();
      if (names.has(instanceName)) {
        throw fail(
          `the instance name ${instanceName} is used more than once. Give each instance in the same environment a distinct name.`,
        );
      }
      names.add(instanceName);
      instances.push(
        new CatalogComponentInstance(
          env.trim(),
          instanceName,
          url as string | undefined,
        ),
      );
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
