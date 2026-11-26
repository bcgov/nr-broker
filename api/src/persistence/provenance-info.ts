import { ProvenanceEmbeddable } from './entity/provenance.embeddable';
import { ProvenanceType } from './dto/provenance.dto';

/**
 * The provenance record to apply when adding or editing a vertex or edge.
 */
export class ProvenanceInfo {
  constructor(readonly record: ProvenanceEmbeddable) {}

  static manual(): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.manual());
  }

  static intention(intentionId: string): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.intention(intentionId));
  }

  static opensearch(): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.opensearch());
  }

  static catalog(repository: string, path: string): ProvenanceInfo {
    return new ProvenanceInfo(ProvenanceEmbeddable.catalog(repository, path));
  }

  get type(): ProvenanceType {
    return this.record.type;
  }

  /**
   * The records to save after applying this update to existing records.
   */
  mergeInto(records: ProvenanceEmbeddable[] | undefined): ProvenanceEmbeddable[] {
    return ProvenanceEmbeddable.merge(records, this.record);
  }
}
