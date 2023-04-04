import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ProjectDto } from '../dto/project.dto';
import { ProjectRepository } from '../interfaces/project.repository';

@Injectable()
export class ProjectMongoRepository implements ProjectRepository {
  constructor(
    @InjectRepository(ProjectDto)
    private projectRepository: MongoRepository<ProjectDto>,
  ) {}

  public async getProjectByVertexId(id: string): Promise<ProjectDto> {
    return this.projectRepository.findOne({
      where: { vertex: ObjectId(id) } as any,
    });
  }
}
