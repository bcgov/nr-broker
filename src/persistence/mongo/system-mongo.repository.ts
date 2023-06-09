import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
// import { ObjectId } from 'mongodb';

import { JwtAllowDto } from '../dto/jwt-allow.dto';
import { JwtBlockDto } from '../dto/jwt-block.dto';
import { JwtRegistryDto } from '../dto/jwt-registry.dto';
import { JwtDto } from '../dto/jwt.dto';
import { SystemRepository } from '../interfaces/system.repository';
import { PreferenceDto } from '../dto/preference.dto';
import { PreferenceRestDto } from '../dto/preference-rest.dto';
import { AccountDto } from '../dto/account.dto';
import { ObjectId } from 'mongodb';
import { GroupRegistryByAccountDto } from '../dto/group-registry-by-account.dto';

export class SystemMongoRepository implements SystemRepository {
  constructor(
    @InjectRepository(AccountDto)
    private accountRepository: MongoRepository<AccountDto>,
    @InjectRepository(JwtAllowDto)
    private jwtAllowRepository: MongoRepository<JwtAllowDto>,
    @InjectRepository(JwtBlockDto)
    private jwtBlockRepository: MongoRepository<JwtBlockDto>,
    @InjectRepository(JwtRegistryDto)
    private jwtRegistryRepository: MongoRepository<JwtRegistryDto>,
    @InjectRepository(PreferenceDto)
    private preferenceRepository: MongoRepository<PreferenceDto>,
  ) {}

  public async jwtMatchesAllowed(jwt: JwtDto): Promise<boolean> {
    return !!(await this.jwtAllowRepository.findOne({
      where: {
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
      } as any,
    }));
  }
  public async jwtMatchesBlocked(jwt: JwtDto): Promise<boolean> {
    return !!(await this.jwtBlockRepository.findOne({
      where: {
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
      } as any,
    }));
  }

  public async addJwtToRegister(
    accountId: string,
    payload: any,
    creator: string,
  ): Promise<boolean> {
    const result = await this.jwtRegistryRepository.insertOne({
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

    if (!result.acknowledged) {
      throw new Error();
    }

    return true;
  }

  public async findExpiredAccounts(
    currentTime: number,
  ): Promise<JwtRegistryDto[]> {
    return this.jwtRegistryRepository.find({
      where: {
        claims: { exp: { $lt: currentTime } },
      },
    });
  }

  public async deleteRegistryJwt(jwt: JwtRegistryDto): Promise<boolean> {
    await this.jwtRegistryRepository.delete(jwt.id);
    await this.jwtBlockRepository.delete({
      jti: jwt.claims.jti,
    });
    await this.jwtAllowRepository.delete({
      jti: jwt.claims.jti,
    });

    return true;
  }

  public async groupRegistryByAccountId(): Promise<
    GroupRegistryByAccountDto[]
  > {
    return this.jwtRegistryRepository
      .aggregate([
        { $fill: { output: { blocked: { value: false } } } },
        {
          $group: {
            _id: { accountId: '$accountId' },
            createdAt: { $push: '$createdAt' },
            jti: { $push: '$claims.jti' },
            blocked: { $push: '$blocked' },
          },
        },
      ])
      .toArray() as unknown as GroupRegistryByAccountDto[];
  }

  public async blockJwtByJti(jti: string) {
    const result = await this.jwtBlockRepository.insertOne({
      jti,
    });

    if (!result.acknowledged) {
      throw new Error();
    }

    await this.jwtRegistryRepository.updateOne(
      { 'claims.jti': jti },
      {
        $set: { blocked: true },
      },
    );

    return true;
  }

  public getPreferences(guid: string): Promise<PreferenceDto> {
    return this.preferenceRepository.findOne({
      where: {
        guid,
      },
    });
  }

  public async setPreferences(
    guid: string,
    preference: PreferenceRestDto,
  ): Promise<boolean> {
    const result = await this.preferenceRepository.updateOne(
      { guid },
      {
        $set: preference,
        $setOnInsert: {
          guid,
        },
      },
      { upsert: true },
    );
    return result.matchedCount === 1 || result.upsertedCount === 1;
  }
}
