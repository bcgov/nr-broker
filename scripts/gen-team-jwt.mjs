#!/usr/bin/env node

// See: https://jwt.io

import { createHmac, randomUUID } from 'node:crypto';
import process from 'node:process';

const hmac = createHmac('sha256', process.env['JWT_SECRET']);

const header = {
  alg: 'HS256',
  typ: 'JWT',
};

const MILLISECONDS_IN_SECOND = 1000;
const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
const ISSUED_AT = Math.floor(Date.now() / MILLISECONDS_IN_SECOND);

const payload = {
  exp: ISSUED_AT + DAYS_30_IN_SECONDS,
  iat: ISSUED_AT,
  nbf: ISSUED_AT,
  jti: randomUUID(),
  sub: 'oneteam@victoria1.gov.bc.ca',
};

const headerStr = Buffer.from(JSON.stringify(header), 'utf8').toString(
  'base64url',
);

const payloadStr = Buffer.from(JSON.stringify(payload), 'utf8').toString(
  'base64url',
);

hmac.update(headerStr + '.' + payloadStr);
console.log(`${headerStr}.${payloadStr}.${hmac.digest('base64url')}`);
