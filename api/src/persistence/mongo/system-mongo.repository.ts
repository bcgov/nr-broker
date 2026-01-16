import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/core';
import { MongoEntityRepository } from '@mikro-orm/mongodb';
import { ObjectId } from 'mongodb';

import { ConnectionConfigEntity } from '../entity/connection-config.entity';
import { JwtRegistryEntity } from '../entity/jwt-registry.entity';
import { JwtDto } from '../dto/jwt.dto';
import { SystemRepository } from '../interfaces/system.repository';
import { PreferenceEntity } from '../entity/preference.entity';
import { GroupRegistryByAccountDto } from '../dto/group-registry-by-account.dto';
import { UserAliasRequestEntity } from '../entity/user-alias-request.entity';
import { JwtBlockEntity } from '../entity/jwt-block.entity';
import { JwtAllowEntity } from '../entity/jwt-allow.entity';

export class SystemMongoRepository implements SystemRepository {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(ConnectionConfigEntity)
    private readonly connectionConfigRepository: MongoEntityRepository<ConnectionConfigEntity>,
    @InjectRepository(JwtAllowEntity)
    private readonly jwtAllowRepository: MongoEntityRepository<JwtAllowEntity>,
    @InjectRepository(JwtBlockEntity)
    private readonly jwtBlockRepository: MongoEntityRepository<JwtBlockEntity>,
    @InjectRepository(JwtRegistryEntity)
    private readonly jwtRegistryRepository: MongoEntityRepository<JwtRegistryEntity>,
    @InjectRepository(UserAliasRequestEntity)
    private readonly userAliasRequestRepository: MongoEntityRepository<UserAliasRequestEntity>,
    @InjectRepository(PreferenceEntity)
    private readonly preferenceRepository: MongoEntityRepository<PreferenceEntity>,
  ) {}

  public async jwtMatchesAllowed(jwt: JwtDto): Promise<boolean> {
    return !!(await this.jwtAllowRepository.findOne({
      $and: [
        {
          $or: [
            { client_id: jwt.client_id },
            { client_id: { $exists: false } },
          ],
        },
        {
          $or: [{ jti: jwt.jti }, { jti: { $exists: false } }],
        },
        {
          $or: [{ sub: jwt.sub }, { sub: { $exists: false } }],
        },
      ],
    } as any));
  }

  public async jwtMatchesBlocked(jwt: JwtDto): Promise<boolean> {
    return !!(await this.jwtBlockRepository.findOne({
      $and: [
        {
          $or: [
            { client_id: jwt.client_id },
            { client_id: { $exists: false } },
          ],
        },
        {
          $or: [{ jti: jwt.jti }, { jti: { $exists: false } }],
        },
        {
          $or: [{ sub: jwt.sub }, { sub: { $exists: false } }],
        },
      ],
    } as any));
  }

  public async addJwtToRegister(
    accountId: string,
    payload: any,
    creator: string,
  ): Promise<boolean> {
    const result = await this.jwtRegistryRepository.insert({
      accountId: new ObjectId(accountId),
      claims: {
        client_id: payload.client_id,
        exp: payload.exp,
        jti: payload.jti,
        sub: payload.sub,
      },
      createdUserId: new ObjectId(creator),
      createdAt: new Date(),
    });

    if (!result) {
      throw new Error();
    }

    return true;
  }

  public async getRegisteryJwts(
    accountId: string,
  ): Promise<JwtRegistryEntity[]> {
    return this.jwtRegistryRepository.find({
      accountId: new ObjectId(accountId),
    });
  }

  public async getRegisteryJwtByClaimJti(
    jti: string,
  ): Promise<JwtRegistryEntity> {
    return this.jwtRegistryRepository.findOne({
      'claims.jti': jti,
    } as any);
  }

  public async updateJwtLastUsed(jti: string): Promise<void> {
    await this.jwtRegistryRepository.nativeUpdate(
      { 'claims.jti': jti } as any,
      { lastUsedAt: new Date() },
    );
  }

  public async findExpiredRegistryJwts(
    currentTime: number,
  ): Promise<JwtRegistryEntity[]> {
    return this.jwtRegistryRepository.find({
      claims: { exp: { $lt: currentTime } },
    });
  }

  public async deleteRegistryJwt(jwt: JwtRegistryEntity): Promise<boolean> {
    await this.jwtRegistryRepository.nativeDelete(jwt.id);
    await this.jwtBlockRepository.nativeDelete({
      jti: jwt.claims.jti,
    });
    await this.jwtAllowRepository.nativeDelete({
      jti: jwt.claims.jti,
    });

    return true;
  }

  public async groupRegistryByAccountId(): Promise<
    GroupRegistryByAccountDto[]
  > {
    return this.jwtRegistryRepository.aggregate([
      { $fill: { output: { blocked: { value: false } } } },
      {
        $group: {
          _id: { accountId: '$accountId' },
          createdAt: { $push: '$createdAt' },
          jti: { $push: '$claims.jti' },
          blocked: { $push: '$blocked' },
        },
      },
    ]) as unknown as GroupRegistryByAccountDto[];
  }

  public async blockJwtByJti(jti: string) {
    const result = await this.jwtBlockRepository.insert({
      jti,
    });

    if (!result) {
      throw new Error();
    }

    await this.jwtRegistryRepository.getCollection().updateOne(
      { 'claims.jti': jti },
      {
        $set: { blocked: true },
      },
    );

    return true;
  }

  public getPreferences(guid: string): Promise<PreferenceEntity> {
    return this.preferenceRepository.findOne({
      guid,
    });
  }

  public async setPreferences(preference: PreferenceEntity): Promise<void> {
    this.em.persist(preference).flush();
  }

  public getConnectionConfigs(): Promise<ConnectionConfigEntity[]> {
    return this.connectionConfigRepository.findAll();
  }

  public async generateUserAliasRequestState(
    accountId: string,
    domain: string,
  ): Promise<string> {
    const state = randomUUID();
    await this.userAliasRequestRepository.getCollection().deleteMany({
      accountId: new ObjectId(accountId),
      domain,
    });

    await this.userAliasRequestRepository.insert({
      accountId: new ObjectId(accountId),
      createdAt: new Date(),
      domain,
      state,
    });

    return state;
  }

  public async getUserAliasRequestState(
    accountId: string,
    domain: string,
  ): Promise<string> {
    const request = await this.userAliasRequestRepository.findOne({
      accountId: new ObjectId(accountId),
      domain,
    });

    return request?.state;
  }
}
