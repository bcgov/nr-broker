#!/usr/bin/env node

// See: https://jwt.io
// Assumes that following environment variables set:
// - JWT_KEYS (JSON array with RS256 keys) or JWT_SECRET (HS256 legacy)
// Arguments:
// 1: JWT sub(ject)
// 2: JWT client_id (optional -- random one generated if not set)

/* eslint-disable no-undef */

import { createHmac, createSign, randomUUID } from 'node:crypto';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

let signingKey = null;
const keysJson = process.env['JWT_KEYS'];
if (keysJson) {
  const keys = JSON.parse(keysJson);
  signingKey = keys.find((k) => k.private) ?? null;
}
const useRS256 = !!signingKey;

const header = {
  alg: useRS256 ? 'RS256' : 'HS256',
  typ: 'JWT',
};
if (useRS256) {
  header.kid = signingKey.kid;
}

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

let signature;
if (useRS256) {
  const signer = createSign('RSA-SHA256');
  signer.update(headerStr + '.' + payloadStr);
  signature = signer.sign(signingKey.private, 'base64url');
} else {
  const hmac = createHmac('sha256', process.env['JWT_SECRET']);
  hmac.update(headerStr + '.' + payloadStr);
  signature = hmac.digest('base64url');
}

const output = `${headerStr}.${payloadStr}.${signature}`;

spawnSync(
  'mongosh -u mongoadmin -p secret --authenticationDatabase admin brokerDB db/mongo-add-jwt-reg.js',
  [],
  {
    cwd: process.cwd(),
    encoding: 'utf-8',
    env: {
      ...process.env,
      JWT_CLIENT_ID: clientId,
      JWT_EXP: payload.exp,
      JWT_JTI: payload.jti,
      JWT_SUB: payload.sub,
    },
    shell: true,
  },
);

console.log(output);
