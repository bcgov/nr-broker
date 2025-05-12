import nodemailer from 'nodemailer';
import {
  NOTIFICATION_EMAIL_FROM,
  NOTIFICATION_EMAIL_HOST,
  NOTIFICATION_EMAIL_SECURE,
  NOTIFICATION_EMAIL_PORT,
} from '../constants';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: NOTIFICATION_EMAIL_HOST,
      port: NOTIFICATION_EMAIL_PORT,
      secure: NOTIFICATION_EMAIL_SECURE === 'true', // Use TLS if true
    });
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const mailOptions = {
      from: NOTIFICATION_EMAIL_FROM,
      to,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
    };

    await this.transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.error('Error occurred: ' + error.message);
      }
      console.info('Message sent: %s', info.messageId);
    });
  }
}
