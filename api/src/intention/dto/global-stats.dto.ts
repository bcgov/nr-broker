import { ApiProperty } from '@nestjs/swagger';

/**
 * Global and per-team statistics about closed intentions, used by the home
 * page to celebrate team successes and surface activity at a glance.
 */
export class GlobalStatsDto {
  @ApiProperty({
    description: 'Total number of closed intentions with a success outcome',
  })
  totalSuccesses!: number;

  @ApiProperty({ description: 'Total number of closed intentions' })
  totalClosed!: number;

  @ApiProperty({
    description: 'Share of closed intentions that succeeded (0..1)',
  })
  successRate!: number;

  @ApiProperty({
    description: 'Successful intentions closed in the last 24 hours',
  })
  successesToday!: number;

  @ApiProperty({
    description:
      'Breakdown of successful intentions by action type, most frequent first',
  })
  byAction!: Record<string, number>;

  @ApiProperty({
    description:
      'Per-account activity, most active first, used to highlight teams',
  })
  byAccount!: AccountActivityDto[];

  @ApiProperty({
    description: 'Most recent closed intentions, used to seed the live feed',
  })
  recent!: RecentIntentionDto[];
}

export class AccountActivityDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty({ description: 'Number of successful intentions for this account' })
  successes!: number;
}

export class RecentIntentionDto {
  @ApiProperty()
  intentionId!: string;

  @ApiProperty({ description: 'Outcome of the intention (success, failure, ...)' })
  outcome!: string;

  @ApiProperty({ description: 'The action that was performed', required: false })
  action?: string;

  @ApiProperty({ description: 'The project the action targeted', required: false })
  project?: string;

  @ApiProperty({ description: 'The service the action targeted', required: false })
  service?: string;

  @ApiProperty({ description: 'The environment the action targeted', required: false })
  environment?: string;

  @ApiProperty({ description: 'The user who performed the action', required: false })
  user?: string;

  @ApiProperty({ description: 'ISO timestamp when the intention closed', required: false })
  timestamp?: string;
}
