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
import {
  ALLOW_BODY_VALUE_METADATA_KEY,
  AllowBodyValueArgs,
} from '../allow-body-value.decorator';
import { ROLES_METADATA_KEY } from '../roles.decorator';
import { ALLOW_EMPTY_EDGE_METADATA_KEY } from '../allow-empty-edges.decorator';

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
    const roles = this.reflector.get<string[]>(
      ROLES_METADATA_KEY,
      context.getHandler(),
    );
    if (
      !roles ||
      (request.user.userinfo.client_roles &&
        roles.every((role) =>
          request.user.userinfo.client_roles.includes(role),
        ))
    ) {
      return true;
    }
    const allowBodyValues = this.reflector.get<AllowBodyValueArgs[]>(
      ALLOW_BODY_VALUE_METADATA_KEY,
      context.getHandler(),
    );
    if (
      allowBodyValues &&
      allowBodyValues.some(
        (test) => get(request.body, test.path) === test.value,
      )
    ) {
      return true;
    }

    const emptyEdges = this.reflector.get<string[]>(
      ALLOW_EMPTY_EDGE_METADATA_KEY,
      context.getHandler(),
    );
    if (emptyEdges && request.body && request.body.target) {
      const vertex = await this.graphRepository.getVertex(request.body.target);
      const info = await this.graphRepository.getVertexInfo(
        request.body.target,
      );

      if (
        vertex &&
        info.incoming === 0 &&
        info.outgoing === 0 &&
        emptyEdges.indexOf(vertex.collection) !== -1
      ) {
        return true;
      }
    }

    // Allow owners of graph operations to continue
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
    const permission: string = userUpstreamData.permission;
    // Mask data alterations as owner to prevent priviledged changes
    // console.log(userUpstreamData.permission);
    // console.log(userUpstreamData.sudoMaskKey);
    // console.log(request.query);
    // console.log(request.params);
    request.user.mask =
      userUpstreamData.sudoMaskKey &&
      request.query[userUpstreamData.sudoMaskKey] === 'true'
        ? 'sudo'
        : permission;
    const user = await this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      userGuid,
    );
    // console.log(`mask: ${request.user.mask}`);
    if (userUpstreamData.graphObjectType === 'collection') {
      const targetCollection =
        await this.collectionRepository.getCollectionById(
          userUpstreamData.graphObjectCollection,
          graphId,
        );
      if (!targetCollection) {
        return false;
      }
      // console.log(permission);
      // console.log(
      //   await this.util.testUserPermissions(
      //     user.vertex.toString(),
      //     targetCollection.vertex.toString(),
      //     permission,
      //   ),
      // );
      return await this.util.testUserPermissions(
        user.vertex.toString(),
        targetCollection.vertex.toString(),
        permission,
      );
    } else if (userUpstreamData.graphObjectType === 'edge') {
      const targetEdge = await this.graphRepository.getEdge(graphId);
      // console.log(graphId);
      // console.log(targetEdge);
      if (!targetEdge) {
        return false;
      }

      return await this.util.testUserPermissions(
        user.vertex.toString(),
        targetEdge.target.toString(),
        permission,
      );
    } else if (userUpstreamData.graphObjectType === 'vertex') {
      return await this.util.testUserPermissions(
        user.vertex.toString(),
        graphId,
        permission,
      );
    }
    return false;
  }
}
