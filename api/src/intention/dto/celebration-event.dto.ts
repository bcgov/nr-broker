import { ApiProperty } from '@nestjs/swagger';

/**
 * A lightweight "success" event broadcast on the Redis `celebration`
 * pub/sub channel whenever an intention closes successfully. The UI consumes
 * it through a Server-Sent Events stream to celebrate team activity in
 * realtime.
 */
export class CelebrationEventDto {
  @ApiProperty()
  intentionId!: string;

  @ApiProperty({ description: 'Name of the broker account that performed the work' })
  accountName!: string;

  @ApiProperty({
    description: 'The action that was performed (e.g. package-installation)',
  })
  action!: string;

  @ApiProperty({
    description: 'The project the action targeted',
    required: false,
  })
  project?: string;

  @ApiProperty({
    description: 'The service the action targeted',
    required: false,
  })
  service?: string;

  @ApiProperty({
    description: 'The environment the action targeted',
    required: false,
  })
  environment?: string;

  @ApiProperty({
    description: 'The user who performed the action',
    required: false,
  })
  user?: string;

  @ApiProperty({ description: 'ISO timestamp when the intention closed' })
  timestamp!: string;
}
