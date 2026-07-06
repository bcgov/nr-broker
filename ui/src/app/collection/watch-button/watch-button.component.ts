import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { GraphWatchApiService } from '../../service/graph-watch-api.service';
import {
  CollectionWatchConfig,
} from '../../service/persistence/dto/collection-config.dto';
import {
  CollectionWatchDto,
  CollectionWatchIdentifierDto,
} from '../../service/persistence/dto/collection-watch.dto';
import {
  WatchCustomDialogComponent,
  WatchDialogChannelConfig,
} from '../watch-custom-dialog/watch-custom-dialog.component';

type WatchMode = 'default' | 'all' | 'ignore' | 'custom';

interface ChannelSelection {
  channel: string;
  events: string[];
}

@Component({
  selector: 'app-watch-button',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './watch-button.component.html',
  styleUrl: './watch-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchButtonComponent {
  private readonly watchApi = inject(GraphWatchApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly vertexId = input.required<string>();
  readonly watchConfigs = input<CollectionWatchConfig[] | undefined>();
  readonly asMenuItem = input<boolean>(false);

  readonly configuredWatches = computed<CollectionWatchConfig[]>(() => {
    return (this.watchConfigs() ?? []).filter((watchConfig) => {
      return !!watchConfig.channel && watchConfig.events.length > 0;
    });
  });

  readonly watchDescription = computed(() => {
    const configs = this.configuredWatches();
    if (configs.length === 1) {
      return configs[0].description;
    }
    if (configs.length > 1) {
      return 'Notifications for configured channels.';
    }
    return 'Notifications for this channel.';
  });

  readonly mode = computed<WatchMode>(() => {
    const watchConfig = this.watchConfigResource.value();
    const configuredWatches = this.configuredWatches();

    if (configuredWatches.length === 0) {
      return 'default';
    }

    const effectiveWatches = configuredWatches.map((collectionWatchConfig) => {
      return this.getEffectiveWatchForChannel(watchConfig, collectionWatchConfig.channel);
    });

    if (effectiveWatches.every((channelWatch) => !channelWatch)) {
      return 'default';
    }

    if (effectiveWatches.every((channelWatch) => channelWatch?.events === undefined)) {
      return 'ignore';
    }

    const isAll = configuredWatches.every((collectionWatchConfig) => {
      const allowedEvents = collectionWatchConfig.events.map((eventConfig) => eventConfig.event);
      const selectedEvents = this.getSelectedEventsForChannel(
        watchConfig,
        collectionWatchConfig,
      );
      return selectedEvents.length === allowedEvents.length;
    });

    if (isAll) {
      return 'all';
    }

    return 'custom';
  });

  readonly customEvents = computed<string[]>(() => {
    return [];
  });

  readonly channelSelections = computed<ChannelSelection[]>(() => {
    const watchConfig = this.watchConfigResource.value();

    return this.configuredWatches().map((collectionWatchConfig) => {
      return {
        channel: collectionWatchConfig.channel,
        events: this.getSelectedEventsForChannel(watchConfig, collectionWatchConfig),
      };
    });
  });

  readonly saving = signal(false);

  private readonly watchConfigResource = httpResource<CollectionWatchDto>(() => {
    const vertexId = this.vertexId();
    return vertexId ? this.watchApi.getCollectionWatchArgs(vertexId) : undefined;
  });

  readonly summary = computed(() => {
    if (this.mode() === 'default') {
      return 'Default';
    }
    if (this.mode() === 'ignore') {
      return 'Ignore';
    }
    if (this.mode() === 'all') {
      return 'All activity';
    }
    const selectionCounts = this.channelSelections().map((selection) => selection.events.length);
    if (selectionCounts.every((count) => count > 0)) {
      return 'Custom';
    }
    return 'Custom (partial)';
  });

  isModeSelected(mode: WatchMode): boolean {
    return this.mode() === mode;
  }

  selectAllActivity() {
    this.updateWatchMode('all');
  }

  selectDefault() {
    this.watchApi.deleteCollectionWatch(this.vertexId()).subscribe({
      next: () => {
        this.watchConfigResource.reload();
      },
      error: () => {
        this.openSnackBar('Unable to update watch settings. Please try again.');
      },
    });
  }

  selectIgnore() {
    this.updateWatchMode('ignore', []);
  }

  enableCustom() {
    const channelConfigs = this.getDialogChannelConfigs();
    if (channelConfigs.length === 0) {
      this.openSnackBar('Watch configuration is unavailable.');
      return;
    }

    const dialogRef = this.dialog.open(WatchCustomDialogComponent, {
      width: '400px',
      data: {
        channelConfigs,
      },
    });

    dialogRef.afterClosed().subscribe((result: ChannelSelection[] | null) => {
      if (result) {
        const totalSelected = result.reduce((count, channelSelection) => {
          return count + channelSelection.events.length;
        }, 0);

        if (totalSelected === 0) {
          this.openSnackBar('Select at least one event for custom watch.');
          return;
        }

        this.updateWatchMode('custom', result);
      }
    });
  }

  private updateWatchMode(mode: WatchMode, customSelections: ChannelSelection[] = this.channelSelections()) {
    if (this.saving()) {
      return;
    }

    const vertexId = this.vertexId();
    if (!vertexId) {
      return;
    }

    const configuredWatches = this.configuredWatches();
    if (configuredWatches.length === 0) {
      this.openSnackBar('Watch configuration is unavailable.');
      return;
    }

    this.saving.set(true);

    if (mode === 'ignore') {
      // Set empty watch for each configured channel to ignore notifications.
      const watches = configuredWatches.map((watchConfig) => {
        return { channel: watchConfig.channel } satisfies CollectionWatchIdentifierDto;
      });

      this.watchApi.setCollectionWatch(vertexId, watches).subscribe({
        next: () => {
          this.watchConfigResource.reload();
          this.saving.set(false);
        },
        error: () => {
          this.saving.set(false);
          this.openSnackBar('Unable to update watch settings. Please try again.');
        },
      });
      return;
    }

    const watches = configuredWatches.map((watchConfig) => {
      const allowedEvents = watchConfig.events.map((eventConfig) => eventConfig.event);
      const selectedForChannel = customSelections.find((selection) => {
        return selection.channel === watchConfig.channel;
      });
      const selectedEvents =
        mode === 'all'
          ? [...allowedEvents]
          : this.normalizeEventsForAllowed(selectedForChannel?.events, allowedEvents);

      return {
        channel: watchConfig.channel,
        events: selectedEvents,
      } satisfies CollectionWatchIdentifierDto;
    });

    this.watchApi.setCollectionWatch(vertexId, watches).subscribe({
      next: () => {
        this.watchConfigResource.reload();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.openSnackBar('Unable to update watch settings. Please try again.');
      },
    });
  }

  private getEffectiveWatchForChannel(
    watchConfig: CollectionWatchDto | null | undefined,
    channel: string,
  ): CollectionWatchIdentifierDto | undefined {
    const savedWatches = watchConfig?.watches ?? [];
    const defaultWatches = Array.isArray(watchConfig?.defaultWatches)
      ? watchConfig.defaultWatches
      : [];

    const sourceWatches = savedWatches.length > 0 ? savedWatches : defaultWatches;
    return sourceWatches.find((watch) => watch?.channel === channel);
  }

  private normalizeEvents(events?: string[]): string[] {
    return [...(events ?? [])];
  }

  private normalizeEventsForAllowed(events: string[] | undefined, allowedEvents: string[]): string[] {
    if (!events?.length) {
      return [];
    }

    const validEvents = events.filter((event) => {
      return allowedEvents.includes(event);
    });

    return allowedEvents.filter((event) => validEvents.includes(event));
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }

  private getSelectedEventsForChannel(
    watchConfig: CollectionWatchDto | null | undefined,
    collectionWatchConfig: CollectionWatchConfig,
  ): string[] {
    const allowedEvents = collectionWatchConfig.events.map((eventConfig) => eventConfig.event);
    const channelWatch = this.getEffectiveWatchForChannel(watchConfig, collectionWatchConfig.channel);

    if (!channelWatch) {
      return [...allowedEvents];
    }

    if (channelWatch.events === undefined) {
      return [];
    }

    return this.normalizeEventsForAllowed(channelWatch.events, allowedEvents);
  }

  private getDialogChannelConfigs(): WatchDialogChannelConfig[] {
    const watchConfig = this.watchConfigResource.value();

    return this.configuredWatches().map((collectionWatchConfig) => {
      return {
        channel: collectionWatchConfig.channel,
        title: collectionWatchConfig.title,
        description: collectionWatchConfig.description,
        eventConfigs: collectionWatchConfig.events,
        selectedEvents: this.getSelectedEventsForChannel(watchConfig, collectionWatchConfig),
      };
    });
  }
}
