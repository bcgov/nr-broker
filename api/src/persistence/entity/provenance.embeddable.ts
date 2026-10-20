import { Embeddable, Property } from '@mikro-orm/decorators/legacy';
import { ProvenanceType } from '../dto/provenance.dto';

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
    return new ProvenanceEmbeddable(ProvenanceType.MANUAL);
  }

  static intention(): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable(ProvenanceType.INTENTION);
  }

  static opensearch(): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable(ProvenanceType.OPENSEARCH);
  }

  static catalog(repository: string, path: string): ProvenanceEmbeddable {
    return new ProvenanceEmbeddable(ProvenanceType.CATALOG, repository, path);
  }

  /**
   * Merge a record into a list of records. A matching record has its update
   * time refreshed; otherwise the record is appended. With `overwrite`, all
   * records of the same type are replaced by the record (for example, a new
   * catalog repository and path), keeping the earliest creation time.
   */
  static merge(
    records: ProvenanceEmbeddable[] | undefined,
    record: ProvenanceEmbeddable,
    overwrite = false,
  ): ProvenanceEmbeddable[] {
    const merged = (records ?? []).map((existing) =>
      ProvenanceEmbeddable.fromObject(existing),
    );
    if (overwrite) {
      const sameType = merged.filter((existing) => existing.type === record.type);
      const replacement = ProvenanceEmbeddable.fromObject(record);
      replacement.createdAt = sameType.reduce(
        (earliest, existing) =>
          existing.createdAt < earliest ? existing.createdAt : earliest,
        replacement.createdAt,
      );
      return [
        ...merged.filter((existing) => existing.type !== record.type),
        replacement,
      ];
    }
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
   * Catalog records also require a matching repository and path.
   */
  matches(
    other: Pick<ProvenanceEmbeddable, 'type' | 'repository' | 'path'>,
  ): boolean {
    if (this.type !== other.type) {
      return false;
    }
    if (this.type !== ProvenanceType.CATALOG) {
      return true;
    }
    return this.repository === other.repository && this.path === other.path;
  }
}
