import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ServiceInstanceDto } from '../dto/service-instance.dto';
import { ServiceInstanceRepository } from '../interfaces/service-instance.repository';

@Injectable()
export class ServiceInstanceMongoRepository
  implements ServiceInstanceRepository
{
  constructor(
    @InjectRepository(ServiceInstanceDto)
    private serviceInstanceRepository: MongoRepository<ServiceInstanceDto>,
  ) {}

  public async getServiceInstanceByVertexId(
    id: string,
  ): Promise<ServiceInstanceDto> {
    return this.serviceInstanceRepository.findOne({
      where: { vertex: ObjectId(id) } as any,
    });
  }
}
