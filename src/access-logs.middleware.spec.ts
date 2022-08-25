import { AccessLogsMiddleware } from './access-logs.middleware';

describe('AccessLogsMiddleware', () => {
  it('should be defined', () => {
    expect(new AccessLogsMiddleware()).toBeDefined();
  });
});
