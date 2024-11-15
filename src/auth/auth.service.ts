import { Injectable } from '@nestjs/common';
import { get } from 'lodash';
import { Request } from 'express';

import { OAUTH2_CLIENT_MAP_GUID } from '../constants';
import { CollectionRepository } from '../persistence/interfaces/collection.repository';

@Injectable()
export class AuthService {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  public getUserDto(request: Request) {
    const userGuid: string = get(
      (request as any).user.userinfo,
      OAUTH2_CLIENT_MAP_GUID,
    );
    return this.collectionRepository.getCollectionByKeyValue(
      'user',
      'guid',
      userGuid,
    );
  }
}
