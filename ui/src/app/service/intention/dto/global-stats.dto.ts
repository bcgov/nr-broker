/**
 * Global and per-team statistics about closed intentions, used by the home
 * page to celebrate team successes and surface activity at a glance.
 */
export class GlobalStatsDto {
  /** Total number of closed intentions with a success outcome */
  totalSuccesses!: number;

  /** Total number of closed intentions */
  totalClosed!: number;

  /** Share of closed intentions that succeeded (0..1) */
  successRate!: number;

  /** Successful intentions closed in the last 24 hours */
  successesToday!: number;

  /** Breakdown of successful intentions by action type, most frequent first */
  byAction!: Record<string, number>;

  /** Per-account activity, most active first, used to highlight teams */
  byAccount!: AccountActivityDto[];

  /** Most recent closed intentions, used to seed the live feed */
  recent!: RecentIntentionDto[];
}

export class AccountActivityDto {
  /** The id of the broker account */
  accountId!: string;

  /** The name of the broker account */
  accountName!: string;

  /** Number of successful intentions for this account */
  successes!: number;
}

export class RecentIntentionDto {
  /** The id of the intention */
  intentionId!: string;

  /** Outcome of the intention (success, failure, ...) */
  outcome!: string;

  /** The action that was performed */
  action?: string;

  /** The project the action targeted */
  project?: string;

  /** The service the action targeted */
  service?: string;

  /** The environment the action targeted */
  environment?: string;

  /** The user who performed the action */
  user?: string;

  /** ISO timestamp when the intention closed */
  timestamp?: string;
}
