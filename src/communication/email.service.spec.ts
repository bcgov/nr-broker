import { EmailService } from './email.service';

const sendMailMock = jest.fn();
const useMock = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: sendMailMock,
    use: useMock,
  })),
}));

jest.mock('nodemailer-express-handlebars', () => jest.fn());

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
    sendMailMock.mockClear();
    useMock.mockClear();
  });

  const emailBody = {
    teamName: 'test-team',
    accountName: 'myaccount',
    client_id: 'client_id',
    daysUntilExpiration: 1,
  };

  it('should log an error if sendMail fails', async () => {
    const error = new Error('Failed to send email');
    sendMailMock.mockRejectedValueOnce(error);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await service.sendAlertEmail('test@example.com', 'Test Subject', emailBody);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error occurred: ' + error.message,
    );

    consoleErrorSpy.mockRestore();
  });
});
