import { describe, it, expect, vi } from 'vitest';
import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity, CatalogEntityType } from './catalog-entity';
import { CatalogComponentEntity } from './catalog-component.entity';
import { CatalogLocationEntity } from './catalog-location.entity';

describe('CatalogEntity', () => {
  const catalogUtil = new CatalogUtil();
  const allTypes: CatalogEntityType<
    CatalogComponentEntity | CatalogLocationEntity
  >[] = [CatalogComponentEntity, CatalogLocationEntity];

  describe('parseCatalogEntities', () => {
    it('parses a component entity', () => {
      const entities = CatalogEntity.parseCatalogEntities(
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
        allTypes,
        catalogUtil,
      );
      expect(entities).toEqual([
        new CatalogComponentEntity(
          'catalog-info.yaml',
          'artist-web',
          'artist',
          'Artist web',
          'The place to be',
          'production',
          'website',
        ),
      ]);
    });

    it('parses each location document as a separate entity', () => {
      const entities = CatalogEntity.parseCatalogEntities(
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
          '    - https://example.com/catalog-info.yaml',
          '---',
          'apiVersion: backstage.io/v1alpha1',
          'kind: Location',
          'metadata:',
          '  name: single',
          'spec:',
          '  target: ./worker/catalog-info.yaml',
        ].join('\n'),
        allTypes,
        catalogUtil,
      );
      expect(entities).toEqual([
        new CatalogLocationEntity('catalog-info.yaml', [
          'api/catalog-info.yaml',
          'ui/catalog-info.yaml',
        ]),
        new CatalogLocationEntity('catalog-info.yaml', [
          'worker/catalog-info.yaml',
        ]),
      ]);
    });

    it('ignores kinds that are not requested', () => {
      const entities = CatalogEntity.parseCatalogEntities(
        'api/catalog-info.yaml',
        'kind: Location\nspec:\n  target: ../x.yaml\n---\nkind: Component\nmetadata:\n  name: api\n',
        [CatalogComponentEntity],
        catalogUtil,
      );
      expect(entities).toEqual([
        new CatalogComponentEntity('api/catalog-info.yaml', 'api'),
      ]);
    });

    it('reports components without a name and unparsable documents', () => {
      const onError = vi.fn();
      const entities = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        'kind: Component\nmetadata: {}\n---\nkind: [unclosed\n---\nkind: System\nmetadata:\n  name: sys\n',
        allTypes,
        catalogUtil,
        onError,
      );
      expect(entities).toEqual([]);
      expect(onError.mock.calls.map((call) => call[0].message)).toEqual([
        'Catalog component in catalog-info.yaml has no name',
        'Unable to parse catalog document in catalog-info.yaml',
      ]);
    });
  });
});
