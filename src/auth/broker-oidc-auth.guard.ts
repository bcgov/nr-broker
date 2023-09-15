import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { get } from 'radash';
import {
  ALLOW_OWNER_METADATA_KEY,
  AllowOwnerArgs,
} from '../allow-owner.decorator';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { PersistenceUtilService } from '../persistence/persistence-util.service';

/**
 * This guard will issue a HTTP unauthorized if the request is not authenticated.
 * This guard should be used by Rest APIs. Caller is responsible for redirecting to login.
 * This guard should not be used with end points that browsers directly access.
 */

@Injectable()
export class BrokerOidcAuthGuard extends AuthGuard(['oidc']) {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly graphRepository: GraphRepository,
    private readonly util: PersistenceUtilService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (!request.isAuthenticated()) {
      throw new UnauthorizedException();
    }
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (
      !roles ||
      (request.user.userinfo.client_roles &&
        roles.every((role) =>
          request.user.userinfo.client_roles.includes(role),
        ))
    ) {
      return true;
    }
    const userUpstreamData = this.reflector.get<AllowOwnerArgs>(
      ALLOW_OWNER_METADATA_KEY,
      context.getHandler(),
    );
    if (!userUpstreamData) {
      return false;
    }
    const graphId = userUpstreamData.graphIdFromParamKey
      ? request.params[userUpstreamData.graphIdFromParamKey]
      : get(request.body, userUpstreamData.graphIdFromBodyPath);
    const userGuid: string = get(request.user.userinfo, OAUTH2_CLIENT_MAP_GUID);
    const user = await this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      userGuid,
    );
    const requiredEdgeNames = userUpstreamData.requiredEdgeNames ?? ['owner'];
    const upstreamRecursive = userUpstreamData.upstreamRecursive ?? false;
    if (userUpstreamData.graphObjectType === 'collection') {
      const targetCollection =
        await this.collectionRepository.getCollectionById(
          userUpstreamData.graphObjectCollection,
          graphId,
        );
      if (!targetCollection) {
        return false;
      }

      return await this.util.testAccess(
        requiredEdgeNames,
        user.vertex.toString(),
        targetCollection.vertex.toString(),
        upstreamRecursive,
      );
    } else if (userUpstreamData.graphObjectType === 'edge') {
      const targetEdge = await this.graphRepository.getEdge(graphId);
      if (!targetEdge) {
        return false;
      }

      return await this.util.testAccess(
        requiredEdgeNames,
        user.vertex.toString(),
        targetEdge.target.toString(),
        upstreamRecursive,
      );
    } else if (userUpstreamData.graphObjectType === 'vertex') {
      return await this.util.testAccess(
        requiredEdgeNames,
        user.vertex.toString(),
        graphId,
        upstreamRecursive,
      );
    }
    return false;
  }
}
