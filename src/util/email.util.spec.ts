import { EmailService } from './email.util';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    service = new EmailService();
  });

  it('should send an email', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    service.sendEmail('test@example.com', 'Test Subject', 'Test Body');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Sending email to test@example.com with subject "Test Subject"',
    );
  });
});
