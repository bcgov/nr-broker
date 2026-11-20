import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

import { ProvenanceDto, ProvenanceType } from '../../service/persistence/dto/provenance.dto';
import { TimestampDto } from '../../service/persistence/dto/timestamp.dto';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';
import { getCatalogFileUrl } from '../../util/catalog-url.util';
import { ScreenService } from '../../util/screen.service';
import { MatRippleModule } from '@angular/material/core';

/**
 * A provenance record with the display metadata used to present it.
 */
interface DisplayProvenance {
  record: ProvenanceDto;
  label: string;
  icon: string;
  /** Human-readable explanation of what the source is. */
  description: string;
  /** Whether this source is automated (i.e. not a human edit). */
  automated: boolean;
  /** Whether this source is treated as manual when showing overwrite warnings. */
  manualForWarning: boolean;
  /** Catalog-only repository and path, if available. */
  repository?: string;
  path?: string;
  /** Stable identity for the list `track`, unique per type + repository + path. */
  key: string;
}

/**
 * Describes how each provenance source type should be presented.
 * `automated` sources are the ones that can keep managing an item a user edited
 * by hand, which is why a manual edit alongside an automated source is flagged.
 */
const PROVENANCE_META: Record<
  ProvenanceType,
  {
    label: string;
    icon: string;
    description: string;
    automated: boolean;
    manualForWarning: boolean;
  }
> = {
  [ProvenanceType.MANUAL]: {
    label: 'Manual',
    icon: 'edit',
    description: 'Added or edited by a person through the API or UI.',
    automated: false,
    manualForWarning: true,
  },
  [ProvenanceType.CATALOG]: {
    label: 'Catalog',
    icon: 'description',
    description: 'Added or updated by a GitHub catalog scan.',
    automated: true,
    manualForWarning: false,
  },
  [ProvenanceType.INTENTION]: {
    label: 'Intention',
    icon: 'sync',
    description: 'Added or updated by intention sync.',
    automated: true,
    manualForWarning: false,
  },
  [ProvenanceType.OPENSEARCH]: {
    label: 'OpenSearch',
    icon: 'storage',
    description: 'Added or updated by the OpenSearch graph sync.',
    automated: true,
    manualForWarning: false,
  },
};

/**
 * Shown as a tooltip on the "Most recent" tag when a manual edit is in effect
 * but automated sources can still overwrite it.
 */
const MANUAL_EDIT_TOOLTIP =
  'This item was most recently edited manually, but automated sources still manage it. ' +
  'Those sources can update the item and may overwrite the manual change.';

/**
 * Shown as a tooltip on the "Creator" tag when a source's created time
 * matches the item's created time.
 */
const CREATOR_TOOLTIP = 'This source created the item. Its created time matches when the item was created.';

/** Creator dates are displayed to the nearest second, without milliseconds. */
const CREATOR_DATE_PRECISION_MS = 1000;

@Component({
  selector: 'app-inspector-provenance',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatTooltipModule,
    RouterLink,
    DetailsItemComponent,
  ],
  templateUrl: './inspector-provenance.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inspector-provenance.component.scss',
})
export class InspectorProvenanceComponent {
  readonly provenance = input<ProvenanceDto[]>();

  /**
   * Whether the "Managed By" hint text is visible. Driven by the parent
   * "Show help" toggle, matching the sibling inspector panels.
   */
  readonly showHelp = input(false);

  /**
   * The item's own timestamps, used to recognise the source that created it.
   */
  readonly timestamps = input<TimestampDto>();

  /**
   * Whether the remove button is shown on each source. Removing is limited to
   * admins, so the parent decides.
   */
  readonly canRemove = input(false);

  /** Emits the record to remove when the user selects its remove button. */
  readonly removeRecord = output<ProvenanceDto>();

  readonly screen = inject(ScreenService);

  /**
   * Shown as a tooltip on the "Most recent" tag when a manual edit is in effect
   * but automated sources can still overwrite it.
   */
  readonly manualEditTooltip = MANUAL_EDIT_TOOLTIP;

  /**
   * Shown as a tooltip on the "Creator" tag when a source's created time
   * matches the item's created time.
   */
  readonly creatorTooltip = CREATOR_TOOLTIP;

  /**
   * Records sorted so the most recently updated source appears first, with
   * presentation metadata attached.
   */
  readonly sortedProvenance = computed<DisplayProvenance[]>(() => {
    const records = this.provenance();
    if (!records || records.length === 0) {
      return [];
    }
    return [...records]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((record) => {
        const meta = PROVENANCE_META[record.type] ?? PROVENANCE_META[ProvenanceType.MANUAL];
        return {
          record,
          ...meta,
          repository: record.repository,
          path: record.path,
          key: `${record.type}|${record.repository ?? ''}|${record.path ?? ''}`,
        };
      });
  });

  /**
   * The most recently updated record. This is the source that most recently
   * applied its changes to the item.
   */
  readonly latestProvenance = computed<DisplayProvenance | null>(() => {
    const sorted = this.sortedProvenance();
    return sorted.length > 0 ? sorted[0] : null;
  });

  /**
   * The provenance record whose creation time matches the graph item's
   * creation time, when that source is still available.
   */
  readonly creatorProvenance = computed<DisplayProvenance | null>(() => {
    const itemCreatedAtValue: unknown = this.timestamps()?.createdAt;
    if (itemCreatedAtValue === undefined || itemCreatedAtValue === null) {
      return null;
    }
    const itemCreatedAt =
      typeof itemCreatedAtValue === 'number' || typeof itemCreatedAtValue === 'string'
        ? new Date(itemCreatedAtValue).getTime()
        : itemCreatedAtValue instanceof Date
          ? itemCreatedAtValue.getTime()
          : Number.NaN;
    if (Number.isNaN(itemCreatedAt)) {
      return null;
    }
    return (
      this.sortedProvenance().find((source) => {
        const sourceCreatedAt = new Date(source.record.createdAt).getTime();
        const sourceCreatedSecond = Math.floor(sourceCreatedAt / CREATOR_DATE_PRECISION_MS);
        const itemCreatedSecond = Math.floor(itemCreatedAt / CREATOR_DATE_PRECISION_MS);
        return !Number.isNaN(sourceCreatedAt) && sourceCreatedSecond === itemCreatedSecond;
      }) ?? null
    );
  });

  readonly hasProvenance = computed(() => this.sortedProvenance().length > 0);

  /**
   * Whether the full list is shown. By default only the most recent source is
  * displayed; the "Show more" button expands to the full list.
   */
  readonly expanded = signal(false);

  /**
   * The records currently visible: only the most recent when collapsed, or the
   * full list when expanded.
   */
  readonly displayProvenance = computed(() => {
    if (this.expanded()) {
      return this.sortedProvenance();
    }
    const latest = this.latestProvenance();
    return latest ? [latest] : [];
  });

  /**
   * Number of sources hidden while collapsed.
   */
  readonly additionalCount = computed(() => this.sortedProvenance().length - 1);

  readonly hasAdditional = computed(() => this.additionalCount() > 0);

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  /**
   * True when the most recent change was a manual edit but other automated
   * sources also manage the item. Those sources can still update the item and
   * may revert the manual change, so it is worth flagging.
   */
  readonly showManualWarning = computed(() => {
    const latest = this.latestProvenance();
    if (!latest?.manualForWarning) {
      return false;
    }
    return this.sortedProvenance().some(
      (record) => record.automated && !record.manualForWarning,
    );
  });

  /**
   * Whether this source is the one that created the item: its created time
   * matches the item's created time within a small window. Returns false when
   * the item's created time is unknown or the source time cannot be parsed.
   */
  isCreator(source: DisplayProvenance): boolean {
    return this.creatorProvenance()?.key === source.key;
  }

  /**
   * For a catalog source, builds a link to the catalog file on GitHub when the
   * repository is a GitHub URL and a path is present, so the user can open the
   * file on the default branch using HEAD. Returns undefined for non-GitHub repositories or
   * when no path is available.
   */
  catalogFileUrl(source: DisplayProvenance): string | undefined {
    return getCatalogFileUrl(source.record);
  }
}
