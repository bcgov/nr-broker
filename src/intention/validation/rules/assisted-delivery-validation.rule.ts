import { Injectable } from '@nestjs/common';
import { BaseValidationRule } from '../validation-rule.interface';
import { IDecisionContext, IDecisionResult } from '../decision-context.interface';
import { CollectionRepository } from '../../../persistence/interfaces/collection.repository';
import { GraphRepository } from '../../../persistence/interfaces/graph.repository';
import { PersistenceUtilService } from '../../../persistence/persistence-util.service';

/**
 * Validation Rule: Assisted Delivery Authorization
 *
 * DMN Decision: Verify that the user is authorized to perform changes
 * in the specified environment
 *
 * Business Rule: Users must have appropriate change roles for the
 * project/service/environment combination. Validates graph relationships
 * and role-based access.
 *
 * Drools equivalent would check:
 * - IF project and service exist
 * - AND component edge exists between project and service
 * - AND user has appropriate change roles for environment
 * - THEN pass
 * - ELSE fail with user.id or service.name violation
 */
@Injectable()
export class AssistedDeliveryValidationRule extends BaseValidationRule {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly persistenceUtil: PersistenceUtilService,
  ) {
    super();
  }

  getRuleName(): string {
    return 'assisted-delivery-validation';
  }

  getPriority(): number {
    return 80; // Execute later - requires database queries
  }

  async evaluate(context: IDecisionContext): Promise<IDecisionResult> {
    const project = await this.collectionRepository.getCollectionByKeyValue(
      'project',
      'name',
      context.action.service.project,
    );
    const service = await this.collectionRepository.getCollectionByKeyValue(
      'service',
      'name',
      context.action.service.name,
    );
    const environment = await this.collectionRepository.getCollectionByKeyValue(
      'environment',
      'name',
      context.action.service.environment,
    );

    // Check if project and service exist -- not possible as they are required to open
    if (!project || !service) {
      return this.pass();
    }

    const vertex = await this.graphRepository.getEdgeByNameAndVertices(
      'component',
      project.vertex.toString(),
      service.vertex.toString(),
    );

    if (!vertex) {
      return this.fail('Cannot find component edge', 'service.name');
    }

    const hasAccess = await this.persistenceUtil.testAccess(
      vertex.getPropAsArray(
        `changeroles-${context.action.service.environment}`,
        environment.changeRoles,
      ),
      context.user.vertex.toString(),
      service.vertex.toString(),
      true,
    );

    if (hasAccess) {
      return this.pass();
    } else {
      return this.fail(
        'User is not authorized to access this environment',
        'user.id',
      );
    }
  }
}
