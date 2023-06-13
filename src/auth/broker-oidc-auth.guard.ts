import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserUpstreamArgs } from '../user-upstream.decorator';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';
import { GraphRepository } from '../persistence/interfaces/graph.repository';
import { OAUTH2_CLIENT_MAP_GUID } from '../constants';

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
    const userUpstreamData = this.reflector.get<UserUpstreamArgs>(
      'user-upstream',
      context.getHandler(),
    );
    if (userUpstreamData) {
      const collection = await this.collectionRepository.getCollectionById(
        userUpstreamData.collection,
        request.params[userUpstreamData.param],
      );
      if (!collection) {
        throw new BadRequestException();
      }
      const config = await this.collectionRepository.getCollectionConfigByname(
        'user',
      );
      if (!config) {
        throw new InternalServerErrorException();
      }

      const upstream = await this.graphRepository.getUpstreamVertex(
        collection.vertex.toString(),
        config.index,
        [userUpstreamData.edgeName],
      );
      if (
        upstream.filter(
          (data) =>
            data.collection.guid ===
            request.user.userinfo[OAUTH2_CLIENT_MAP_GUID],
        ).length > 0
      ) {
        return true;
      }
    }
    if (!roles) {
      return true;
    }
    return (
      request.user.userinfo.client_roles &&
      roles.every((role) => request.user.userinfo.client_roles.includes(role))
    );
  }
}
