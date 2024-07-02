import { DateUtil } from './date.util';

describe('DateUtil', () => {
  let util: DateUtil;

  beforeEach(async () => {
    util = new DateUtil();
  });

  it('computeIndex to return the correct index', () => {
    expect(
      util.computeIndex(
        'audit-broker-test',
        new Date(1719945895397),
        new Date(1719945895398),
      ),
    ).toBe('audit-broker-test');
    expect(
      util.computeIndex(
        'audit-broker-d',
        new Date(1719945895397),
        new Date(1719945895398),
      ),
    ).toBe('audit-broker-2024-07-02');
    expect(
      util.computeIndex(
        'audit-broker-test,audit-broker-d',
        new Date(1719945895397),
        new Date(1719945895398),
      ),
    ).toBe('audit-broker-test,audit-broker-2024-07-02');
  });
});
