import { describe, expect, it } from 'vitest';
import { ProvenanceType } from '../service/persistence/dto/provenance.dto';
import { getCatalogFileUrl } from './catalog-url.util';

describe('getCatalogFileUrl', () => {
  it('builds a GitHub link using the HEAD ref and encodes path segments', () => {
    expect(
      getCatalogFileUrl({
        type: ProvenanceType.CATALOG,
        repository: 'https://github.com/example/repo/',
        path: 'components/my web/catalog-info.yaml',
      }),
    ).toBe('https://github.com/example/repo/blob/HEAD/components/my%20web/catalog-info.yaml');
  });

  it('returns undefined for non-catalog, non-GitHub or pathless records', () => {
    expect(
      getCatalogFileUrl({ type: ProvenanceType.MANUAL, repository: 'https://github.com/a/b', path: 'c.yaml' }),
    ).toBeUndefined();
    expect(
      getCatalogFileUrl({ type: ProvenanceType.CATALOG, repository: 'https://gitlab.com/a/b', path: 'c.yaml' }),
    ).toBeUndefined();
    expect(
      getCatalogFileUrl({ type: ProvenanceType.CATALOG, repository: 'https://github.com/a/b' }),
    ).toBeUndefined();
  });
});
