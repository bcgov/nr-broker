import { Injectable, Logger } from '@nestjs/common';
import { CommunicationTaskService } from './communication-task.service';
import { UserDto } from '../persistence/dto/user.dto';

@Injectable()
export class CommunicationDummyService extends CommunicationTaskService {
  private readonly logger = new Logger(CommunicationDummyService.name);

  public type(): string {
    return 'dummy';
  }

  public async send(
    to: UserDto,
    template: string,
    context: ejs.Data,
  ): Promise<void> {
    const html = await this.render('email', template, to, context);
    const subject = await this.render('subject', template, to, context);
    this.logger.log(
      `to: "${to.username}@${to.domain}" template: "${template}" subject: "${subject}" context: ${JSON.stringify(context)} user: ${JSON.stringify(to)}`,
    );
    this.logger.log(`Rendered HTML: ${html}`);
  }
}
