import { describe, it, expect } from 'vitest';
import { CatalogUtil } from './catalog.util';

describe('CatalogUtil', () => {
  const util = new CatalogUtil();

  describe('resolveComponentReference', () => {
    it.each([
      'artist-api',
      'default/artist-api',
      'component:artist-api',
      'component:default/artist-api',
      ' Component:Default/artist-api ',
    ])('resolves %s to a service name', (reference) => {
      expect(util.resolveComponentReference(reference)).toBe('artist-api');
    });

    it.each([
      'resource:default/database',
      'api:default/artist-api',
      'component:other/artist-api',
      'other/artist-api',
      'component:',
      'artist/api/extra',
      'https://example.com',
      '',
    ])('does not resolve unsupported reference %s', (reference) => {
      expect(util.resolveComponentReference(reference)).toBeNull();
    });
  });

  describe('resolveLocationTarget', () => {
    it('resolves targets relative to the declaring file', () => {
      expect(
        util.resolveLocationTarget('catalog-info.yaml', './api/catalog-info.yaml'),
      ).toBe('api/catalog-info.yaml');
      expect(
        util.resolveLocationTarget('apps/catalog-info.yaml', '../ui/catalog-info.yaml'),
      ).toBe('ui/catalog-info.yaml');
    });

    it('ignores urls, globs, absolute paths and paths outside the repository', () => {
      expect(
        util.resolveLocationTarget('catalog-info.yaml', 'https://github.com/a/b/catalog-info.yaml'),
      ).toBeNull();
      expect(
        util.resolveLocationTarget('catalog-info.yaml', './*/catalog-info.yaml'),
      ).toBeNull();
      expect(
        util.resolveLocationTarget('catalog-info.yaml', '/api/catalog-info.yaml'),
      ).toBeNull();
      expect(
        util.resolveLocationTarget('catalog-info.yaml', '../other/catalog-info.yaml'),
      ).toBeNull();
      expect(util.resolveLocationTarget('catalog-info.yaml', 42)).toBeNull();
    });
  });

  describe('asString', () => {
    it('returns non-empty strings only', () => {
      expect(util.asString('a')).toBe('a');
      expect(util.asString('')).toBeUndefined();
      expect(util.asString(1)).toBeUndefined();
    });
  });
});
