import { createPublicKey } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtKeyEntry {
  kid: string;
  privateKey: string;
  publicKey: string;
}

@Injectable()
export class JwtKeyService {
  private readonly logger = new Logger(JwtKeyService.name);
  private readonly keys: JwtKeyEntry[] = [];
  private readonly keysByKid = new Map<string, JwtKeyEntry>();

  constructor(private readonly configService: ConfigService) {
    const keysJson = this.configService.get<string>('JWT_KEYS');
    if (keysJson) {
      const parsed = JSON.parse(keysJson);
      for (const entry of parsed) {
        if (!entry.kid || !entry.public) {
          this.logger.warn('Skipping JWT key entry missing kid or public key');
          continue;
        }
        const keyEntry: JwtKeyEntry = {
          kid: entry.kid,
          privateKey: entry.private ?? null,
          publicKey: entry.public,
        };
        this.keys.push(keyEntry);
        this.keysByKid.set(entry.kid, keyEntry);
      }
      this.logger.log(
        `Loaded ${this.keys.length} JWT key(s), signing kid: ${this.getSigningKey()?.kid ?? 'none'}`,
      );
    }
  }

  /** The first key with a private key is the active signing key. */
  getSigningKey(): JwtKeyEntry | null {
    return this.keys.find((k) => k.privateKey) ?? null;
  }

  /** Look up a public key by kid for verification. */
  getPublicKeyByKid(kid: string): string | null {
    return this.keysByKid.get(kid)?.publicKey ?? null;
  }

  /** Whether any RS256 keys are configured. */
  hasKeys(): boolean {
    return this.keys.length > 0;
  }

  /** Build the JWKS response with all public keys. */
  getJwks(): { keys: object[] } | null {
    if (this.keys.length === 0) {
      return null;
    }
    return {
      keys: this.keys.map((entry) => {
        const publicKey = createPublicKey(entry.publicKey);
        const jwk = publicKey.export({ format: 'jwk' });
        return {
          ...jwk,
          alg: 'RS256',
          use: 'sig',
          kid: entry.kid,
        };
      }),
    };
  }
}
