import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CollectionWatchEventConfig } from '../../service/persistence/dto/collection-config.dto';

export interface WatchDialogChannelConfig {
  channel: string;
  title?: string;
  description?: string;
  eventConfigs: CollectionWatchEventConfig[];
  selectedEvents: string[];
}

export interface WatchDialogData {
  channelConfigs: WatchDialogChannelConfig[];
}

@Component({
  selector: 'app-watch-custom-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './watch-custom-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './watch-custom-dialog.component.scss',
})
export class WatchCustomDialogComponent {
  readonly data = inject<WatchDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<WatchCustomDialogComponent>>(MatDialogRef);
  readonly channelConfigs = this.data.channelConfigs;

  isSelected(channel: string, event: string): boolean {
    const channelConfig = this.channelConfigs.find((config) => config.channel === channel);
    return !!channelConfig?.selectedEvents.includes(event);
  }

  toggleEvent(channel: string, event: string) {
    const channelConfig = this.channelConfigs.find((config) => config.channel === channel);
    if (!channelConfig) {
      return;
    }

    channelConfig.selectedEvents = this.isSelected(channel, event)
      ? channelConfig.selectedEvents.filter((e) => e !== event)
      : [...channelConfig.selectedEvents, event];
  }

  onEventKeydown(event: Event, channel: string, eventName: string) {
    event.preventDefault();
    this.toggleEvent(channel, eventName);
  }

  save() {
    this.dialogRef.close(
      this.channelConfigs.map((channelConfig) => {
        return {
          channel: channelConfig.channel,
          events: [...channelConfig.selectedEvents],
        };
      }),
    );
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
