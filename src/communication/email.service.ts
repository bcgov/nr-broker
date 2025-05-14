import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import {
  NOTIFICATION_EMAIL_FROM,
  NOTIFICATION_EMAIL_HOST,
  NOTIFICATION_EMAIL_SECURE,
  NOTIFICATION_EMAIL_PORT,
} from '../constants';
import hbs from 'nodemailer-express-handlebars';
import { join } from 'path';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: NOTIFICATION_EMAIL_HOST,
      port: NOTIFICATION_EMAIL_PORT,
      secure: NOTIFICATION_EMAIL_SECURE === 'true', // Use TLS if true
    });
    this.transporter.use(
      'compile',
      hbs({
        viewEngine: {
          extname: '.hbs',
          partialsDir: join(__dirname, 'templates'),
          defaultLayout: false,
          layoutsDir: 'communication/templates',
        },
        viewPath: join(__dirname, 'templates'),
        extName: '.hbs',
      }),
    );
  }

  async sendAlertEmail(
    to: string,
    subject: string,
    context: {
      teamName: string;
      accountName: string;
      client_id: string;
      daysUntilExpiration: number;
    },
  ): Promise<void> {
    const mailOptions = {
      from: NOTIFICATION_EMAIL_FROM,
      to,
      subject,
      template: 'token-expiration-alert',
      context,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      //console.info('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error occurred: ' + error.message);
    }
  }
}
