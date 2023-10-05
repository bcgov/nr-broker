import { ValidatorUtil } from './validator.util';

describe('ValidatorUtil', () => {
  let util: ValidatorUtil;

  beforeEach(async () => {
    util = new ValidatorUtil();
  });

  it('buildFirstFailedPropertyErrorMsg returns constraint failure', () => {
    expect(
      util.buildFirstFailedPropertyErrorMsg({
        target: {},
        property: 'bob',
        children: [
          {
            target: {},
            property: 'life',
            constraints: { successful: 'one' },
            children: [],
          },
        ],
      }),
    ).toBe(
      'Property .bob.life has failed the following constraints: successful',
    );
  });
});
