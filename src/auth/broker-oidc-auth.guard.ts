import {
  ExecutionContext,
  Injectable,
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
    const requiredEdgeName = userUpstreamData.requiredEdgeName ?? 'owner';
    if (userUpstreamData.graphObjectType === 'collection') {
      const targetCollection =
        await this.collectionRepository.getCollectionById(
          userUpstreamData.graphObjectCollection,
          graphId,
        );
      if (!targetCollection) {
        return false;
      }
      const edge = await this.graphRepository.getEdgeByNameAndVertices(
        requiredEdgeName,
        user.vertex.toString(),
        targetCollection.vertex.toString(),
      );

      return !!edge;
    } else if (userUpstreamData.graphObjectType === 'edge') {
      const targetEdge = await this.graphRepository.getEdge(graphId);
      if (!targetEdge) {
        return false;
      }
      const edge = await this.graphRepository.getEdgeByNameAndVertices(
        requiredEdgeName,
        user.vertex.toString(),
        targetEdge.target.toString(),
      );

      return !!edge;
    } else if (userUpstreamData.graphObjectType === 'vertex') {
      const edge = await this.graphRepository.getEdgeByNameAndVertices(
        requiredEdgeName,
        user.vertex.toString(),
        graphId,
      );

      return !!edge;
    }
    return false;
    //   this.graphRepository.getEdgeByNameAndVertices
    //   const collection =
    //     userUpstreamData.retrieveCollection === 'byId'
    //       ? await this.collectionRepository.getCollectionById(
    //           userUpstreamData.collection,
    //           id,
    //         )
    //       : await this.collectionRepository.getCollectionByVertexId(
    //           userUpstreamData.collection,
    //           id,
    //         );
    //   if (!collection) {
    //     throw new BadRequestException();
    //   }
    //   const config =
    //     await this.collectionRepository.getCollectionConfigByName('user');
    //   if (!config) {
    //     throw new InternalServerErrorException();
    //   }

    //   const upstream = await this.graphRepository.getUpstreamVertex(
    //     collection.vertex.toString(),
    //     config.index,
    //     [userUpstreamData.requiredEdgetoUserName],
    //   );
    //   if (
    //     upstream.filter(
    //       (data) =>
    //         data.collection.guid ===
    //         request.user.userinfo[OAUTH2_CLIENT_MAP_GUID],
    //     ).length > 0
    //   ) {
    //     return true;
    //   }
    // } else if (
    //   userUpstreamData &&
    //   userUpstreamData.graphObjectType === 'edge'
    // ) {
    //   const id = userUpstreamData.graphIdFromParamKey
    //     ? request.params[userUpstreamData.graphIdFromParamKey]
    //     : request.body[userUpstreamData.graphIdFromBodyPath];
    //   console.log(request);
    //   const edge = await this.graphRepository.getEdge(id);
    //   if (!edge) {
    //     throw new BadRequestException();
    //   }

    //   const config =
    //     await this.collectionRepository.getCollectionConfigByName('user');
    //   if (!config) {
    //     throw new InternalServerErrorException();
    //   }

    //   const upstream = await this.graphRepository.getUpstreamVertex(
    //     edge.target.toString(),
    //     config.index,
    //     [userUpstreamData.requiredEdgetoUserName],
    //   );
    //   if (
    //     upstream.filter(
    //       (data) =>
    //         data.collection.guid ===
    //         request.user.userinfo[OAUTH2_CLIENT_MAP_GUID],
    //     ).length > 0
    //   ) {
    //     return true;
    //   }
    // }
    // if (!roles) {
    //   return true;
    // }
    // return (
    //   request.user.userinfo.client_roles &&
    //   roles.every((role) => request.user.userinfo.client_roles.includes(role))
    // );
  }
}
