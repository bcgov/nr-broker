import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ServiceRepository } from '../interfaces/service.repository';
import { ServiceDto } from '../dto/service.dto';

@Injectable()
export class ServiceMongoRepository implements ServiceRepository {
  constructor(
    @InjectRepository(ServiceDto)
    private serviceRepository: MongoRepository<ServiceDto>,
  ) {}

  public async getServiceByVertexId(id: string): Promise<ServiceDto> {
    return this.serviceRepository.findOne({
      where: { vertex: ObjectId(id) } as any,
    });
  }
}
