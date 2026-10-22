import { ProvenanceEmbeddable } from './entity/provenance.embeddable';
import { ProvenanceType } from './dto/provenance.dto';

export interface ProvenanceInfoOptions {
  /**
   * Allow updates to an item with no records of the same type. The record is
   * then added, so the source manages the item from then on.
   */
  adoptable?: boolean;
  /**
   * Always allow updates. Records of the same type are replaced, so a catalog
   * record moves to the new repository and path.
   */
  overwrite?: boolean;
}

/**
 * The provenance record to apply when adding or editing a vertex or edge,
 * with options that change when an edit is allowed.
 */
export class ProvenanceInfo {
  readonly adoptable: boolean;
  readonly overwrite: boolean;

  constructor(
    readonly record: ProvenanceEmbeddable,
    options: ProvenanceInfoOptions = {},
  ) {
    this.adoptable = options.adoptable ?? false;
    this.overwrite = options.overwrite ?? false;
  }

  static manual(): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.manual());
  }

  static intention(): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.intention());
  }

  static opensearch(): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.opensearch());
  }

  static catalog(
    repository: string,
    path: string,
    options: ProvenanceInfoOptions = {},
  ): ProvenanceInfo {
    return new ProvenanceInfo(
      ProvenanceEmbeddable.catalog(repository, path),
      options,
    );
  }

  get type(): ProvenanceType {
    return this.record.type;
  }

  /**
   * The records to save after applying this update to existing records.
   */
  mergeInto(records: ProvenanceEmbeddable[] | undefined): ProvenanceEmbeddable[] {
    return ProvenanceEmbeddable.merge(records, this.record, this.overwrite);
  }
}
