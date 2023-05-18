import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { JwtAllowDto } from '../dto/jwt-allow.dto';
import { JwtBlockDto } from '../dto/jwt-block.dto';
import { JwtDto } from '../dto/jwt.dto';
import { SystemRepository } from '../interfaces/system.repository';
import { PreferenceDto } from '../dto/preference.dto';
import { PreferenceRestDto } from '../dto/preference-rest.dto';

export class SystemMongoRepository implements SystemRepository {
  constructor(
    @InjectRepository(JwtAllowDto)
    private jwtAllowRepository: MongoRepository<JwtAllowDto>,
    @InjectRepository(JwtBlockDto)
    private jwtBlockRepository: MongoRepository<JwtBlockDto>,
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
