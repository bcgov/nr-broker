import { describe, it, expect } from 'vitest';
import { ProvenanceEmbeddable } from './provenance.embeddable';
import { ProvenanceType } from '../dto/provenance.dto';

describe('ProvenanceEmbeddable', () => {
  const repo = 'https://github.com/org/repo';

  it('matches catalog records by repository and path', () => {
    const record = ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml');
    expect(record.matches(ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml'))).toBe(true);
    expect(record.matches(ProvenanceEmbeddable.catalog(repo, 'b/catalog-info.yaml'))).toBe(false);
    expect(
      record.matches(ProvenanceEmbeddable.catalog('https://github.com/org/other', 'catalog-info.yaml')),
    ).toBe(false);
    expect(record.matches(ProvenanceEmbeddable.manual())).toBe(false);
  });

  it('matches other records by type', () => {
    expect(ProvenanceEmbeddable.intention().matches(ProvenanceEmbeddable.intention())).toBe(true);
    expect(ProvenanceEmbeddable.intention().matches(ProvenanceEmbeddable.opensearch())).toBe(false);
  });

  it('records manual provenance with an explicit type', () => {
    expect(ProvenanceEmbeddable.manual().type).toBe(ProvenanceType.MANUAL);
  });

  it('merges matching records and appends others', () => {
    const created = new Date('2024-01-01');
    const existing = [
      { type: 'manual', createdAt: created, updatedAt: created },
      { type: 'catalog', repository: repo, path: 'catalog-info.yaml', createdAt: created, updatedAt: created },
    ] as ProvenanceEmbeddable[];

    const update = ProvenanceEmbeddable.catalog(repo, 'catalog-info.yaml');
    const merged = ProvenanceEmbeddable.merge(existing, update);
    expect(merged).toHaveLength(2);
    expect(merged[1].createdAt).toEqual(created);
    expect(merged[1].updatedAt).toEqual(update.updatedAt);

    const appended = ProvenanceEmbeddable.merge(merged, ProvenanceEmbeddable.intention());
    expect(appended.map((record) => record.type)).toEqual(['manual', 'catalog', 'intention']);
    expect(ProvenanceEmbeddable.merge(undefined, update)).toHaveLength(1);
  });

  it('replaces records of the same type when overwriting', () => {
    const created = new Date('2020-01-01');
    const existing = [
      { type: 'manual', createdAt: created, updatedAt: created },
      { type: 'catalog', repository: repo, path: 'catalog-info.yaml', createdAt: created, updatedAt: created },
    ] as ProvenanceEmbeddable[];

    const moved = ProvenanceEmbeddable.catalog('https://github.com/org/moved', 'app/catalog-info.yaml');
    const merged = ProvenanceEmbeddable.merge(existing, moved, true);
    expect(merged).toHaveLength(2);
    expect(merged[0].type).toBe('manual');
    expect(merged[1]).toMatchObject({
      repository: 'https://github.com/org/moved',
      path: 'app/catalog-info.yaml',
      createdAt: created,
      updatedAt: moved.updatedAt,
    });
  });
});
