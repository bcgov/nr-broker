import { Injectable } from '@nestjs/common';
import {
  NOTIFICATION_EMAIL_FROM,
  NOTIFICATION_EMAIL_HOST,
  NOTIFICATION_EMAIL_SECURE,
  NOTIFICATION_EMAIL_PORT,
} from '../constants';
import { join } from 'path';
import nodemailer from 'nodemailer';
import ejs from 'ejs';
import { promises as fs } from 'fs';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: NOTIFICATION_EMAIL_HOST,
      port: NOTIFICATION_EMAIL_PORT,
      secure: NOTIFICATION_EMAIL_SECURE === 'true', // Use TLS if true
    });
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
    const templatePath = join(
      __dirname,
      'templates',
      'token-expiration-alert.ejs',
    );
    try {
      const template = await fs.readFile(templatePath, 'utf-8');
      const html = ejs.render(template, context);

      const mailOptions = {
        from: NOTIFICATION_EMAIL_FROM,
        to,
        subject,
        html,
      };
      await this.transporter.sendMail(mailOptions);
      //console.info('Message sent: %s', info.messageId);
    } catch (error) {
      console.error('Error occurred: ' + error.message);
    }
  }
}
