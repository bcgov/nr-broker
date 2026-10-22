import { describe, it, expect, vi } from 'vitest';
import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity, CatalogEntityType } from './catalog-entity';
import { CatalogComponent } from './catalog-component';
import { CatalogLocationEntity } from './catalog-location';

describe('CatalogEntity', () => {
  const catalogUtil = new CatalogUtil();
  const allTypes: CatalogEntityType<
    CatalogComponent | CatalogLocationEntity
  >[] = [CatalogComponent, CatalogLocationEntity];

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
        new CatalogComponent(
          'catalog-info.yaml',
          'artist-web',
          'artist',
          'Artist web',
          'The place to be',
          'production',
          'website',
          undefined,
          'artist-relations-team',
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
        [CatalogComponent],
        catalogUtil,
      );
      expect(entities).toEqual([
        new CatalogComponent('api/catalog-info.yaml', 'api'),
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

  describe('instances annotation', () => {
    const parse = (annotation: string) => {
      const onError = vi.fn();
      const entities = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        [
          'kind: Component',
          'metadata:',
          '  name: api',
          '  annotations:',
          `    playbook.io.nrs.gov.bc.ca/instances: '${annotation}'`,
        ].join('\n'),
        [CatalogComponent],
        catalogUtil,
        onError,
      );
      return {
        instances: entities[0]?.instances,
        errors: onError.mock.calls.map((call) => call[0].message),
      };
    };

    it('leaves instances undefined without the annotation', () => {
      const [entity] = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        'kind: Component\nmetadata:\n  name: api\n',
        [CatalogComponent],
        catalogUtil,
      );
      expect(entity.instances).toBeUndefined();
    });

    it('defaults the name to the environment', () => {
      expect(
        parse(
          '[{"env":"production","name":"blue","url":"https://blue.example.gov.bc.ca"},{"env":"production","name":"green"},{"env":"test"}]',
        ),
      ).toEqual({
        instances: [
          {
            env: 'production',
            name: 'blue',
            url: 'https://blue.example.gov.bc.ca',
          },
          { env: 'production', name: 'green' },
          { env: 'test', name: 'test' },
        ],
        errors: [],
      });
    });

    it.each([
      ['not json', 'the value is not valid JSON'],
      ['{"env":"test"}', 'the value must be a JSON array'],
      ['[{"name":"x"}]', 'each entry must have an env'],
      ['[{"env":"test","url":"ftp://x"}]', 'url must be an http or https URL'],
      [
        '[{"env":"test"},{"env":"production","name":"test"}]',
        'the instance name test is used more than once',
      ],
    ])('rejects %s', (annotation, reason) => {
      const { instances, errors } = parse(annotation);
      expect(instances).toBeUndefined();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(
        'Catalog component api in catalog-info.yaml has an invalid playbook.io.nrs.gov.bc.ca/instances annotation',
      );
      expect(errors[0]).toContain(reason);
    });
  });
});
