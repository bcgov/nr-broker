#!/usr/bin/env node

// See: https://jwt.io

import { createHmac } from 'node:crypto';

const hmac = createHmac('sha256', 'secret');

const header = {
  alg: 'HS256',
  typ: 'JWT',
};

const payload = {
  exp: Date.now() + 500000,
  iat: Date.now(),
  name: 'encora',
  sub: '1234567890',
  roles: ['developer_spar'],
};

const headerStr = Buffer.from(JSON.stringify(header), 'utf8').toString(
  'base64url',
);

const payloadStr = Buffer.from(JSON.stringify(payload), 'utf8').toString(
  'base64url',
);

hmac.update(headerStr + '.' + payloadStr);
console.log(`${headerStr}.${payloadStr}.${hmac.digest('base64url')}`);
