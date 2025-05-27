import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { EmailService } from './email.service';
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import ejs from 'ejs';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    use: jest.fn(),
  })),
}));
jest.mock('ejs', () => ({
  render: jest.fn(),
}));

(fs.promises.readFile as unknown as jest.Mock) = jest.fn();

describe('EmailService', () => {
  let service: EmailService;
  let sendMailMock: jest.Mock;
  let useMock: jest.Mock;
  let readFileMock: jest.Mock;
  let ejsRenderMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn();
    useMock = jest.fn();
    readFileMock = fs.promises.readFile as jest.Mock;
    ejsRenderMock = ejs.render as jest.Mock;

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
      use: useMock,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call sendMail with correct parameters', async () => {
    const emailBody = {
      teamName: 'test-team',
      accountName: 'myaccount',
      client_id: 'client_id',
      daysUntilExpiration: 1,
    };

    readFileMock.mockResolvedValue('<ejs template>');
    ejsRenderMock.mockReturnValue('<html>Rendered Email</html>');

    await service.sendAlertEmail('test@example.com', 'Test Subject', emailBody);

    expect(readFileMock).toHaveBeenCalled();
    expect(ejsRenderMock).toHaveBeenCalledWith('<ejs template>', emailBody);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: expect.any(String),
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<html>Rendered Email</html>',
    });
  });

  it('should log an error if sendMail fails', async () => {
    readFileMock.mockResolvedValue('<ejs template>');
    ejsRenderMock.mockReturnValue('<html>Rendered Email</html>');
    const error = new Error('Failed to send email');
    sendMailMock.mockRejectedValueOnce(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await service.sendAlertEmail('test@example.com', 'Test Subject', {
      teamName: 'test-team',
      accountName: 'myaccount',
      client_id: 'client_id',
      daysUntilExpiration: 1,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error occurred: ' + error.message,
    );

    consoleErrorSpy.mockRestore();
  });
});
