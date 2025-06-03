import { Inject, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import { NOTIFICATION_EMAIL_FROM } from '../constants';
import { COMMUNICATION_EMAIL_TRANSPORT } from './communication.constants';
import { CommunicationTaskService } from './communication-task.service';
import { UserDto } from '../persistence/dto/user.dto';

@Injectable()
export class CommunicationEmailService extends CommunicationTaskService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject(COMMUNICATION_EMAIL_TRANSPORT)
    private readonly emailTransport: nodemailer.TransportOptions,
  ) {
    super();
    this.transporter = nodemailer.createTransport(this.emailTransport);
  }

  public type(): string {
    return 'email';
  }

  public async send(
    to: UserDto,
    template: string,
    context: ejs.Data,
  ): Promise<void> {
    const html = await this.render('email', template, to, context);
    const subject = await this.render('subject', template, to, context);

    const mailOptions = {
      from: NOTIFICATION_EMAIL_FROM,
      to: to.email,
      subject,
      html,
    };
    await this.transporter.sendMail(mailOptions);
    //console.info('Message sent: %s', info.messageId);
  }
}
