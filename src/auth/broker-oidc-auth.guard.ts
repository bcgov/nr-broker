import {
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import {
  ALLOW_OWNER_METADATA_KEY,
  AllowOwnerArgs,
} from '../allow-owner.decorator';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { get } from 'radash';

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
    private reflector: Reflector,
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

      return await this.testAccess(
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

      return await this.testAccess(
        requiredEdgeNames,
        user.vertex.toString(),
        targetEdge.target.toString(),
        upstreamRecursive,
      );
    } else if (userUpstreamData.graphObjectType === 'vertex') {
      return await this.testAccess(
        requiredEdgeNames,
        user.vertex.toString(),
        graphId,
        upstreamRecursive,
      );
    }
    return false;
  }

  async testAccess(
    edges: string[],
    userId: string,
    graphId: string,
    upstreamRecursive: boolean,
  ) {
    if (upstreamRecursive) {
      const config =
        await this.collectionRepository.getCollectionConfigByName('user');
      if (!config) {
        throw new InternalServerErrorException();
      }

      const upstream = await this.graphRepository.getUpstreamVertex(
        graphId,
        config.index,
        edges,
      );
      return (
        upstream.filter((data) => data.collection.vertex.toString() === userId)
          .length > 0
      );
    } else {
      for (const edgeName of edges) {
        const edge = await this.graphRepository.getEdgeByNameAndVertices(
          edgeName,
          userId,
          graphId,
        );
        if (!!edge) {
          return true;
        }
      }
      return false;
    }
  }
}
