import { beforeEach, describe, it, expect, vi, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationEmailService } from './communication-email.service';
import nodemailer from 'nodemailer';
import * as fs from 'fs';
import ejs from 'ejs';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn(),
      use: vi.fn(),
    })),
  },
}));
vi.mock('ejs', () => ({
  default: {
    render: vi.fn(),
  },
}));

(fs.promises.readFile as unknown as Mock) = vi.fn();

describe('EmailService', () => {
  let service: CommunicationEmailService;
  let sendMailMock: Mock;
  let useMock: Mock;
  let readFileMock: Mock;
  let ejsRenderMock: Mock;

  beforeEach(async () => {
    sendMailMock = vi.fn();
    useMock = vi.fn();
    readFileMock = fs.promises.readFile as Mock;
    ejsRenderMock = ejs.render as Mock;

    (nodemailer.createTransport as Mock).mockReturnValue({
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
      .useMocker(() => {
        return vi.fn();
      })
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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
