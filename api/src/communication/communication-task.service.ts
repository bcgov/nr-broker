import { Injectable } from '@nestjs/common';
import { join } from 'path';
import ejs from 'ejs';
import { promises as fs } from 'fs';
import { BROKER_URL } from '../constants';
import { UserDto } from '../persistence/dto/user.dto';

@Injectable()
export abstract class CommunicationTaskService {
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
    const TEMPLATE_PATH = join(
      __dirname,
      'templates',
      `${template}-${type}.ejs`,
    );
    const templateContent = await fs.readFile(TEMPLATE_PATH, 'utf-8');
    return ejs.render(templateContent, {
      user: to,
      brokerUrl: BROKER_URL,
      ...context,
    });
  }
}
