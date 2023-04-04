import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { EnvironmentRepository } from '../interfaces/environment.repository';
import { EnvironmentDto } from '../dto/environment.dto';

@Injectable()
export class EnvironmentMongoRepository implements EnvironmentRepository {
  constructor(
    @InjectRepository(EnvironmentDto)
    private environmentRepository: MongoRepository<EnvironmentDto>,
  ) {}

  public async getEnvironmentByVertexId(id: string): Promise<EnvironmentDto> {
    return this.environmentRepository.findOne({
      where: { vertex: ObjectId(id) } as any,
    });
  }
}
