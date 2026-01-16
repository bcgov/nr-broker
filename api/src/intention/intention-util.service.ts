import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dto/user.dto';
import { UserEmbeddable } from './entity/user.embeddable';
import { UserCollectionService } from '../collection/user-collection.service';
import { UserEntity } from '../persistence/entity/user.entity';
import { BrokerAccountEntity } from '../persistence/entity/broker-account.entity';
import { IntentionEntity } from './entity/intention.entity';
import { IntentionDto } from './dto/intention.dto';

/**
 * Intention util
 */
@Injectable()
export class IntentionUtilService {
  constructor(private readonly userCollectionService: UserCollectionService) {}

  public async convertUserDtoToEmbed(
    user: UserDto,
    accountEntity: BrokerAccountEntity,
  ): Promise<UserEmbeddable> {
    let userEntity: UserEntity;

    if (user.id) {
      userEntity = await this.userCollectionService.lookupUserByGuid(user.id);
    } else if (user.name) {
      userEntity = await this.userCollectionService.lookupUserByName(
        user.name,
        user.domain,
      );

      if (!userEntity) {
        userEntity = await this.userCollectionService.lookupUserByAlias(
          user.name,
          user.domain,
        );
      }
    }

    if (userEntity) {
      return UserEmbeddable.fromUserEntity(userEntity, accountEntity);
    }

    if (accountEntity.skipUserValidation) {
      const embeddable = new UserEmbeddable();
      embeddable.name = user.name;
      return embeddable;
    }

    throw new Error('User not found.');
  }

  public convertIntentionEntityToDto(
    intention: IntentionEntity,
  ): IntentionDto {
    return plainToInstance(IntentionDto, intention, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }
}
