import { describe, it, expect, vi } from 'vitest';
import { CatalogUtil } from '../util/catalog.util';
import { CatalogEntity, CatalogEntityType } from './catalog-entity';
import { CatalogComponent } from './catalog-component';
import { CatalogLocationEntity } from './catalog-location';
import { CatalogSystem } from './catalog-system';

describe('CatalogEntity', () => {
  const catalogUtil = new CatalogUtil();
  const allTypes: CatalogEntityType<
    CatalogComponent | CatalogSystem | CatalogLocationEntity
  >[] = [CatalogComponent, CatalogSystem, CatalogLocationEntity];

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

    it('parses component relationship references', () => {
      const [entity] = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        [
          'kind: Component',
          'metadata:',
          '  name: artist-web',
          'spec:',
          '  subcomponentOf: component:default/artist',
          '  dependsOn:',
          '    - artist-api',
          '    - resource:default/database',
        ].join('\n'),
        [CatalogComponent],
        catalogUtil,
      );
      expect(entity.subcomponentOf).toBe('component:default/artist');
      expect(entity.dependsOn).toEqual(['artist-api', 'resource:default/database']);
    });

    it.each([
      { subcomponentOf: ['parent'] },
      { subcomponentOf: ' ' },
      { dependsOn: 'dependency' },
      { dependsOn: [123] },
      { dependsOn: [''] },
    ])('reports invalid relationship fields %j', (spec) => {
      const onError = vi.fn();
      expect(CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        JSON.stringify({ kind: 'Component', metadata: { name: 'api' }, spec }),
        [CatalogComponent],
        catalogUtil,
        onError,
      )).toEqual([]);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('has an invalid spec.') }),
      );
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
      expect(entities).toEqual([new CatalogSystem('catalog-info.yaml', 'sys')]);
      expect(onError.mock.calls.map((call) => call[0].message)).toEqual([
        'Catalog component in catalog-info.yaml has no name',
        'Unable to parse catalog document in catalog-info.yaml',
      ]);
    });

    it('parses mixed documents and reports invalid systems without losing valid entities', () => {
      const onError = vi.fn();
      const entities = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        [
          'kind: Component',
          'metadata:',
          '  name: api',
          'spec:',
          '  system: sys',
          '---',
          'kind: System',
          'metadata: {}',
          '---',
          'kind: System',
          'metadata:',
          '  name: sys',
          '  title: System title',
          '  description: System description',
          '---',
          'kind: Resource',
          'metadata:',
          '  name: ignored',
          '---',
        ].join('\n'),
        allTypes,
        catalogUtil,
        onError,
      );
      expect(entities).toEqual([
        new CatalogComponent('catalog-info.yaml', 'api', 'sys'),
        new CatalogSystem('catalog-info.yaml', 'sys', 'System title', 'System description'),
      ]);
      expect(onError.mock.calls.map((call) => call[0].message)).toEqual([
        'Catalog system in catalog-info.yaml has no name',
      ]);
    });
  });

  describe('instance links', () => {
    const parse = (links: unknown) => {
      const onError = vi.fn();
      const entities = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        [
          'kind: Component',
          'metadata:',
          '  name: api',
          `  links: ${JSON.stringify(links)}`,
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

    it('leaves instances undefined without links and ignores the old annotation', () => {
      const [entity] = CatalogEntity.parseCatalogEntities(
        'catalog-info.yaml',
        [
          'kind: Component',
          'metadata:',
          '  name: api',
          '  annotations:',
          '    playbook.io.nrs.gov.bc.ca/instances: \'[{"env":"test","name":"old","url":"https://old.example.gov.bc.ca"}]\'',
        ].join('\n'),
        [CatalogComponent],
        catalogUtil,
      );
      expect(entity.instances).toBeUndefined();
    });

    it('uses the title as the name and defaults to the environment when omitted', () => {
      expect(
        parse([
          { type: 'instance', env: ' production ', title: ' blue ', url: 'https://blue.example.gov.bc.ca' },
          { type: 'instance', env: 'production', title: 'green', url: 'https://green.example.gov.bc.ca' },
          { type: 'instance', env: 'test', url: 'http://test.example.gov.bc.ca' },
        ]),
      ).toEqual({
        instances: [
          {
            env: 'production',
            name: 'blue',
            url: 'https://blue.example.gov.bc.ca',
          },
          { env: 'production', name: 'green', url: 'https://green.example.gov.bc.ca' },
          { env: 'test', name: 'test', url: 'http://test.example.gov.bc.ca' },
        ],
        errors: [],
      });
    });

    it('ignores links without type instance, including unrelated invalid fields', () => {
      expect(parse([
        { type: 'documentation', env: 123, title: false, url: 'not a URL' },
        { env: 'test', url: 'https://ignored.example.gov.bc.ca' },
        null,
        'not a link',
        { type: 'instance', env: 'test', url: 'https://test.example.gov.bc.ca' },
      ])).toEqual({
        instances: [{ env: 'test', name: 'test', url: 'https://test.example.gov.bc.ca' }],
        errors: [],
      });
      expect(parse([])).toEqual({ instances: [], errors: [] });
    });

    it.each([
      ['not an array', 'the value must be an array'],
      [{ type: 'instance' }, 'the value must be an array'],
      [[{ type: 'instance', url: 'https://test.example.gov.bc.ca' }], 'each instance link must have an env'],
      [[{ type: 'instance', env: ' ' }], 'each instance link must have an env'],
      [[{ type: 'instance', env: 'test', title: '' }], 'instance link title must be a non-empty string'],
      [[{ type: 'instance', env: 'test', title: 123 }], 'instance link title must be a non-empty string'],
      [[{ type: 'instance', env: 'test' }], 'each instance link must have an http or https url'],
      [[{ type: 'instance', env: 'test', url: 'ftp://x' }], 'each instance link must have an http or https url'],
      [[{ type: 'instance', env: 'test', url: 123 }], 'each instance link must have an http or https url'],
      [
        [
          { type: 'instance', env: 'test', url: 'https://test.example.gov.bc.ca' },
          { type: 'instance', env: 'production', title: ' test ', url: 'https://prod.example.gov.bc.ca' },
        ],
        'the instance name test is used more than once',
      ],
    ])('rejects %j', (links, reason) => {
      const { instances, errors } = parse(links);
      expect(instances).toBeUndefined();
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain(
        'Catalog component api in catalog-info.yaml has invalid metadata.links',
      );
      expect(errors[0]).toContain(reason);
    });
  });
});
