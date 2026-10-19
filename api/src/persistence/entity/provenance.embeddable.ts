import { Embeddable, Property } from '@mikro-orm/decorators/legacy';
import { CollectionSource, ProvenanceType } from '../dto/provenance.dto';

/**
 * Records a source that created or updated a vertex or edge. An item can have
 * several records (for example, a catalog record and a manual record).
 */
@Embeddable()
export class ProvenanceEmbeddable {
  @Property()
  type: ProvenanceType;

  /**
   * Catalog only: SCM URL of the repository containing the catalog file
   */
  @Property({ nullable: true })
  repository?: string;

  /**
   * Catalog only: path of the catalog file relative to the repository root
   */
  @Property({ nullable: true })
  path?: string;

  @Property()
  createdAt: Date;

  @Property()
  updatedAt: Date;

  constructor(type: ProvenanceType, repository?: string, path?: string) {
    this.type = type;
    if (repository) {
      this.repository = repository;
    }
    if (path) {
      this.path = path;
    }
    this.createdAt = new Date();
    this.updatedAt = this.createdAt;
  }

  static manual(): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable('manual');
  }

  static intention(): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable('intention');
  }

  static opensearch(): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable('opensearch');
  }

  static catalog(repository: string, path: string): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable('catalog', repository, path);
  }

  /**
   * Merge a record into a list of records. A matching record has its update
   * time refreshed; otherwise the record is appended.
   */
  static merge(
    records: ProvenanceEmbeddable[] | undefined,
    record: ProvenanceEmbeddable,
  ): ProvenanceEmbeddable[] {
    const merged = (records ?? []).map((existing) =>
      ProvenanceEmbeddable.fromObject(existing),
    );
    const match = merged.find((existing) => existing.matches(record));
    if (match) {
      match.updatedAt = record.updatedAt;
    } else {
      merged.push(ProvenanceEmbeddable.fromObject(record));
    }
    return merged;
  }

  static fromObject(
    value: Pick<
      ProvenanceEmbeddable,
      'type' | 'repository' | 'path' | 'createdAt' | 'updatedAt'
    >,
  ): ProvenanceEmbeddable {
    const record = new ProvenanceEmbeddable(
      value.type,
      value.repository,
      value.path,
    );
    record.createdAt = value.createdAt ?? record.createdAt;
    record.updatedAt = value.updatedAt ?? record.createdAt;
    return record;
  }

  /**
   * The collection source flag for this record. Manual records do not set
   * a source.
   */
  get source(): CollectionSource | null {
    return this.type === 'manual' ? null : this.type;
  }

  /**
   * Catalog records also require a matching repository and path.
   */
  matches(
    other: Pick<ProvenanceEmbeddable, 'type' | 'repository' | 'path'>,
  ): boolean {
    if (this.type !== other.type) {
      return false;
    }
    if (this.type !== 'catalog') {
      return true;
    }
    return this.repository === other.repository && this.path === other.path;
  }
}
