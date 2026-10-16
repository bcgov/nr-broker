import { Injectable } from '@nestjs/common';
import { posix } from 'node:path';

@Injectable()
export class CatalogUtil {
  /**
   * Resolve a Location target relative to the file that declares it. Only
   * relative paths inside the repository are followed; URLs, absolute paths
   * and glob patterns are ignored.
   */
  public resolveLocationTarget(
    fromPath: string,
    target: unknown,
  ): string | null {
    if (typeof target !== 'string' || target === '') {
      return null;
    }
    if (
      target.includes('://') ||
      target.includes('*') ||
      posix.isAbsolute(target)
    ) {
      return null;
    }
    const resolved = posix.normalize(
      posix.join(posix.dirname(fromPath), target),
    );
    if (resolved === '..' || resolved.startsWith('../')) {
      return null;
    }
    return resolved;
  }

  public asString(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
  }
}
