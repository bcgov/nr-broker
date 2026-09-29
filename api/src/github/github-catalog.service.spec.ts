import { describe, it, expect, beforeEach } from 'vitest';
import { GithubCatalogService } from './github-catalog.service';

describe('GithubCatalogService', () => {
  let service: GithubCatalogService;

  beforeEach(() => {
    service = new GithubCatalogService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  describe('resolveLocationTarget', () => {
    it('resolves targets relative to the declaring file', () => {
      expect(
        service.resolveLocationTarget('catalog-info.yaml', './api/catalog-info.yaml'),
      ).toBe('api/catalog-info.yaml');
      expect(
        service.resolveLocationTarget('apps/catalog-info.yaml', '../ui/catalog-info.yaml'),
      ).toBe('ui/catalog-info.yaml');
    });

    it('ignores urls, globs, absolute paths and paths outside the repository', () => {
      expect(
        service.resolveLocationTarget('catalog-info.yaml', 'https://github.com/a/b/catalog-info.yaml'),
      ).toBeNull();
      expect(
        service.resolveLocationTarget('catalog-info.yaml', './*/catalog-info.yaml'),
      ).toBeNull();
      expect(
        service.resolveLocationTarget('catalog-info.yaml', '/api/catalog-info.yaml'),
      ).toBeNull();
      expect(
        service.resolveLocationTarget('catalog-info.yaml', '../other/catalog-info.yaml'),
      ).toBeNull();
      expect(service.resolveLocationTarget('catalog-info.yaml', 42)).toBeNull();
    });
  });

  describe('parseCatalogFile', () => {
    it('parses a component entity', () => {
      const result = service.parseCatalogFile(
        'catalog-info.yaml',
        [
          'apiVersion: backstage.io/v1alpha1',
          'kind: Component',
          'metadata:',
          '  name: artist-web',
          '  title: Artist web',
          '  description: The place to be',
          'spec:',
          '  type: website',
          '  lifecycle: production',
          '  owner: artist-relations-team',
          '  system: artist',
        ].join('\n'),
      );
      expect(result.locations).toEqual([]);
      expect(result.components).toEqual([
        {
          path: 'catalog-info.yaml',
          name: 'artist-web',
          system: 'artist',
          title: 'Artist web',
          description: 'The place to be',
          lifecycle: 'production',
          type: 'website',
        },
      ]);
    });

    it('collects location targets across multiple documents', () => {
      const result = service.parseCatalogFile(
        'catalog-info.yaml',
        [
          'apiVersion: backstage.io/v1alpha1',
          'kind: Location',
          'metadata:',
          '  name: mono',
          'spec:',
          '  targets:',
          '    - ./api/catalog-info.yaml',
          '    - ./ui/catalog-info.yaml',
          '---',
          'apiVersion: backstage.io/v1alpha1',
          'kind: Location',
          'metadata:',
          '  name: single',
          'spec:',
          '  target: ./worker/catalog-info.yaml',
        ].join('\n'),
      );
      expect(result.components).toEqual([]);
      expect(result.locations).toEqual([
        'api/catalog-info.yaml',
        'ui/catalog-info.yaml',
        'worker/catalog-info.yaml',
      ]);
    });

    it('skips components without a name and unparsable documents', () => {
      const result = service.parseCatalogFile(
        'catalog-info.yaml',
        'kind: Component\nmetadata: {}\n---\nkind: [unclosed\n',
      );
      expect(result.components).toEqual([]);
    });
  });
});
