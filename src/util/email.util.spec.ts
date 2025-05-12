import nodemailer from 'nodemailer';
import { EmailService } from './email.util';

const sendMailMock = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: sendMailMock,
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
    sendMailMock.mockClear();
  });

  it('should call sendMail with correct parameters', async () => {
    await service.sendEmail('test@example.com', 'Test Subject', 'Test Body');

    expect(sendMailMock).toHaveBeenCalledWith(
      {
        from: 'NRIDS.TeamOSCAR@gov.bc.ca',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
      },
      expect.any(Function),
    );
  });
});
