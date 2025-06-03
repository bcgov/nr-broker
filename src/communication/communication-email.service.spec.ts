import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-jest';
import { CommunicationEmailService } from './communication-email.service';
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
  let service: CommunicationEmailService;
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
      providers: [
        {
          provide: 'COMMUNICATION_EMAIL_TRANSPORT',
          useValue: {
            host: 'smtp.example.com',
            port: 587,
            secure: false, // true for 465, false for other ports
          },
        },
        CommunicationEmailService,
      ],
    })
      .useMocker(createMock)
      .compile();

    service = module.get<CommunicationEmailService>(CommunicationEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call sendMail with correct parameters', async () => {
    const context = {
      teamName: 'test-team',
      accountName: 'myaccount',
      client_id: 'client_id',
      daysUntilExpiration: 1,
    };

    readFileMock.mockResolvedValue('<ejs template>');
    ejsRenderMock.mockReturnValue('<html>Rendered Email</html>');
    const userObj = {
      email: 'test@example.com',
      id: 'something',
      vertex: '123',
      domain: 'bob',
      guid: '456',
      name: 'Bob',
      username: 'babob',
    };
    await service.send(userObj, 'test', context);

    expect(readFileMock).toHaveBeenCalled();
    expect(ejsRenderMock).toHaveBeenCalledWith('<ejs template>', {
      brokerUrl: '',
      user: userObj,
      ...context,
    });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: expect.any(String),
      to: 'test@example.com',
      subject: '<html>Rendered Email</html>',
      html: '<html>Rendered Email</html>',
    });
  });

  it('should log an error if sendMail fails', async () => {
    readFileMock.mockResolvedValue('<ejs template>');
    ejsRenderMock.mockReturnValue('<html>Rendered Email</html>');
    const error = new Error('Failed to send email');
    sendMailMock.mockRejectedValueOnce(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      await service.send(
        {
          email: 'test@example.com',
          id: 'something',
          vertex: '123',
          domain: 'bob',
          guid: '456',
          name: 'Bob',
          username: 'babob',
        },
        'test',
        {
          teamName: 'test-team',
          accountName: 'myaccount',
          client_id: 'client_id',
          daysUntilExpiration: 1,
        },
      );
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe('Failed to send email');
    }

    consoleErrorSpy.mockRestore();
  });
});
