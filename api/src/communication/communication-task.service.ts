import { Injectable } from '@nestjs/common';
import ejs from 'ejs';
import { BROKER_URL } from '../constants';
import { UserDto } from '../persistence/dto/user.dto';
import { SystemRepository } from '../persistence/interfaces/system.repository';

@Injectable()
export abstract class CommunicationTaskService {
  constructor(protected readonly systemRepository: SystemRepository) {}

  abstract type(): string;

  abstract send(
    to: UserDto,
    template: string,
    context: ejs.Data,
  ): Promise<void>;

  protected async render(
    type: 'email' | 'subject',
    template: string,
    to: UserDto,
    context: ejs.Data,
  ): Promise<string> {
    const dbTemplate = await this.systemRepository.getCommunicationTemplate(
      template,
    );
    if (!dbTemplate) {
      throw new Error(`Communication template not found: ${template}`);
    }

    const templateContent = type === 'email' ? dbTemplate.email : dbTemplate.subject;

    return ejs.render(templateContent, {
      user: to,
      brokerUrl: BROKER_URL,
      ...context,
    });
  }
}
