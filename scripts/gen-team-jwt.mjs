#!/usr/bin/env node

// See: https://jwt.io
// Assumes that following environment variables set:
// - JWT_SECRET
// Arguments:
// 1: JWT sub(ject)
// 2: JWT client_id (optional -- random one generated if not set)

import { createHmac, randomUUID } from 'node:crypto';
import process from 'node:process';

const hmac = createHmac('sha256', process.env['JWT_SECRET']);

const header = {
  alg: 'HS256',
  typ: 'JWT',
};

const args = process.argv.slice(2);
const sub = args[0] ?? process.env['JWT_DEFAULT_SUB'] ?? 'unknown';
const clientId = args[1] ? args[1] : randomUUID();
const MILLISECONDS_IN_SECOND = 1000;
const DAYS_90_IN_SECONDS = 60 * 60 * 24 * 90;
const ISSUED_AT = Math.floor(Date.now() / MILLISECONDS_IN_SECOND);

const payload = {
  client_id: clientId,
  exp: ISSUED_AT + DAYS_90_IN_SECONDS,
  iat: ISSUED_AT,
  nbf: ISSUED_AT,
  jti: randomUUID(),
  sub,
};

const headerStr = Buffer.from(JSON.stringify(header), 'utf8').toString(
  'base64url',
);

const payloadStr = Buffer.from(JSON.stringify(payload), 'utf8').toString(
  'base64url',
);

hmac.update(headerStr + '.' + payloadStr);
console.log(`${headerStr}.${payloadStr}.${hmac.digest('base64url')}`);
