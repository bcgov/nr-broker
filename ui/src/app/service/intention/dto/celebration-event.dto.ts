/**
 * A lightweight "success" event broadcast on the Redis `celebration`
 * pub/sub channel whenever an intention closes successfully. The UI consumes
 * it through a Server-Sent Events stream to celebrate team activity in
 * realtime.
 */
export class CelebrationEventDto {
  /** The id of the intention that closed */
  intentionId!: string;

  /** Name of the broker account that performed the work */
  accountName!: string;

  /** The action that was performed (e.g. package-installation) */
  action!: string;

  /** The project the action targeted */
  project?: string;

  /** The service the action targeted */
  service?: string;

  /** The environment the action targeted */
  environment?: string;

  /** The user who performed the action */
  user?: string;

  /** ISO timestamp when the intention closed */
  timestamp!: string;
}
