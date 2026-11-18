import { CatalogEntityParseError } from './catalog-entity-parse.error';

/**
 * A service instance declared by a component's metadata.links entry.
 */
export class CatalogComponentInstance {
  constructor(
    readonly env: string,
    readonly name: string,
    readonly url: string,
  ) {}

  static parseLinks(
    path: string,
    component: string,
    value: unknown,
  ): CatalogComponentInstance[] | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const fail = (reason: string) =>
      new CatalogEntityParseError(
        `Catalog component ${component} in ${path} has invalid metadata.links: ${reason}`,
      );
    if (!Array.isArray(value)) {
      throw fail('the value must be an array');
    }

    const instances: CatalogComponentInstance[] = [];
    const names = new Set<string>();
    for (const entry of value) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        continue;
      }
      const { type, env, title, url } = entry as Record<string, unknown>;
      if (type !== 'instance') {
        continue;
      }
      if (typeof env !== 'string' || env.trim() === '') {
        throw fail('each instance link must have an env');
      }
      if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
        throw fail('instance link title must be a non-empty string');
      }
      if (!CatalogComponentInstance.isHttpUrl(url)) {
        throw fail('each instance link must have an http or https url');
      }
      const instanceName = (typeof title === 'string' ? title : env).trim();
      if (names.has(instanceName)) {
        throw fail(
          `the instance name ${instanceName} is used more than once. Give each instance link a distinct title.`,
        );
      }
      names.add(instanceName);
      instances.push(
        new CatalogComponentInstance(
          env.trim(),
          instanceName,
          url,
        ),
      );
    }
    return instances;
  }

  private static isHttpUrl(value: unknown): value is string {
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
