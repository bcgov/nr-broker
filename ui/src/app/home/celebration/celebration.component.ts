import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { take } from 'rxjs';

import { IntentionApiService } from '../../service/intention-api.service';
import {
  AccountActivityDto,
  GlobalStatsDto,
  RecentIntentionDto,
} from '../../service/intention/dto/global-stats.dto';
import {
  CelebrationEventDto,
} from '../../service/intention/dto/celebration-event.dto';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';

/**
 * A single entry in the live "recent successes" feed.
 */
export interface CelebrationFeedEntry {
  /** Stable, unique key for the feed entry. */
  id: string;
  event: CelebrationEventDto;
  outcome: string;
  isNew: boolean;
}

/**
 * Celebrates team successes and surfaces global activity on the home page.
 *
 * The component seeds its counters and feed from a one-time
 * {@link IntentionApiService.getGlobalStats} call, then keeps them live by
 * subscribing to the `celebration` Server-Sent Events stream. Each success
 * event bumps the counters, animates the newest entry in the feed, and keeps a
 * rolling history of recent activity.
 */
@Component({
  selector: 'app-celebration',
  imports: [
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    OutcomeIconComponent,
  ],
  templateUrl: './celebration.component.html',
  styleUrl: './celebration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CelebrationComponent implements OnInit {
  private readonly intentionApi = inject(IntentionApiService);
  // Injected so takeUntilDestroyed can be passed explicitly from ngOnInit,
  // which is not itself an injection context.
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the initial stats are still loading. */
  readonly loading = signal(true);
  /** Whether the SSE celebration stream has connected. */
  readonly live = signal(false);

  /** Global counters, seeded from the stats endpoint and bumped on each event. */
  readonly totalSuccesses = signal(0);
  readonly successesToday = signal(0);
  readonly successRate = signal(0);

  /** The most active teams, seeded from the stats endpoint. */
  readonly topTeams = signal<AccountActivityDto[]>([]);

  /** A rolling feed of the most recent successes, newest first. */
  readonly feed = signal<CelebrationFeedEntry[]>([]);

  /** Whether a feed entry is animating (highlighted) as it arrives. */
  private readonly highlightedIds = signal<Set<string>>(new Set());

  /** The percentage used to render the success-rate progress bar. */
  readonly successRatePercent = computed(() =>
    Math.round(this.successRate() * 100),
  );

  /** The top three teams, for the "team spotlight" highlight. */
  readonly topThreeTeams = computed(() => this.topTeams().slice(0, 3));

  ngOnInit(): void {
    this.loadStats();
    this.subscribeCelebrations();
  }

  private loadStats(): void {
    this.intentionApi.getGlobalStats(10, 5).pipe(take(1)).subscribe({
      next: (stats: GlobalStatsDto) => {
        this.applyStats(stats);
      },
      error: () => {
        // Stats are a nice-to-have; a failure should not block the page.
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  private applyStats(stats: GlobalStatsDto): void {
    this.totalSuccesses.set(stats.totalSuccesses ?? 0);
    this.successesToday.set(stats.successesToday ?? 0);
    this.successRate.set(stats.successRate ?? 0);
    this.topTeams.set(stats.byAccount ?? []);

    // Seed the feed with the most recent closed intentions, oldest first so
    // that prepending new events keeps newest on top.
    const recent: CelebrationFeedEntry[] = (stats.recent ?? []).map(
      (item: RecentIntentionDto, index: number) => ({
        // Keep a stable, unique key even when intention ids repeat.
        id: `${item.intentionId}:${index}`,
        outcome: item.outcome,
        isNew: false,
        event: {
          intentionId: item.intentionId,
          accountName: '',
          action: item.action ?? '',
          project: item.project,
          service: item.service,
          environment: item.environment,
          user: item.user,
          timestamp: item.timestamp ?? new Date().toISOString(),
        },
      }));

    // Newest first.
    this.feed.set([...recent].reverse());
  }

  private subscribeCelebrations(): void {
    this.intentionApi
      .createCelebrationEventSource()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: CelebrationEventDto) => this.onCelebration(event),
        error: () => this.live.set(false),
      });
    this.live.set(true);
  }

  private onCelebration(event: CelebrationEventDto): void {
    // Only celebrate successful closes.
    this.totalSuccesses.update((n) => n + 1);
    if (this.isToday(event.timestamp)) {
      this.successesToday.update((n) => n + 1);
    }
    this.live.set(true);

    const key = `${event.intentionId}:${event.timestamp}`;
    const entry: CelebrationFeedEntry = {
      id: key,
      event,
      outcome: 'success',
      isNew: true,
    };
    this.feed.update((items) => [entry, ...items].slice(0, 30));

    // Briefly highlight the new entry, then clear it.
    this.highlightedIds.update((set) => new Set(set).add(key));
    setTimeout(() => {
      this.highlightedIds.update((set) => {
        const next = new Set(set);
        next.delete(key);
        return next;
      });
    }, 1500);
  }

  /** Whether a feed entry is currently highlighted as it arrives. */
  isHighlighted(entry: CelebrationFeedEntry): boolean {
    return this.highlightedIds().has(entry.id);
  }

  private isToday(timestamp?: string): boolean {
    if (!timestamp) {
      return true;
    }
    const when = new Date(timestamp).valueOf();
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).valueOf();
    return when >= startOfToday;
  }

  /** Human-readable description of what was accomplished. */
  describe(entry: CelebrationFeedEntry): string {
    const { action, service, project, environment } = entry.event;
    const parts: string[] = [];
    if (action) {
      parts.push(this.prettifyAction(action));
    }
    if (service) {
      parts.push(`for ${service}`);
    }
    if (environment) {
      parts.push(`in ${environment}`);
    }
    let text = parts.join(' ');
    if (project && !text.toLowerCase().includes(project.toLowerCase())) {
      text = text ? `${text} · ${project}` : project;
    }
    return text || 'a deployment';
  }

  private prettifyAction(action: string): string {
    return action
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Relative time label (e.g. "just now", "3m ago"). */
  timeAgo(entry: CelebrationFeedEntry): string {
    const when = entry.event.timestamp ? new Date(entry.event.timestamp) : null;
    if (!when || Number.isNaN(when.valueOf())) {
      return '';
    }
    const seconds = Math.floor((Date.now() - when.valueOf()) / 1000);
    if (seconds < 60) {
      return 'just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
