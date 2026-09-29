export type OnboardingStepAction =
  | 'create'
  | 'created'
  | 'reuse'
  | 'conflict'
  | 'invalid';

export class OnboardingStepDto {
  /** vertex or edge */
  kind!: 'vertex' | 'edge';
  /** Collection for vertices; edge name for edges */
  type!: string;
  /** Vertex name, or "source -> target" for edges */
  name!: string;
  action!: OnboardingStepAction;
  detail?: string;
  id?: string;
}

export class OnboardingPlanDto {
  /** True when the request asked to apply (not a dry run). */
  apply!: boolean;
  /** False when any step is a conflict or invalid; nothing is applied then. */
  ok!: boolean;
  steps!: OnboardingStepDto[];
}
