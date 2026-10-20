import { Injectable, OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';

/** OWASP Password Storage Cheat Sheet minimum for argon2id: m=19 MiB, t=2, p=1. */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService implements OnModuleInit {
  /** Verified against when the email is unknown, so both login failures cost the same. */
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash('dummy-password-for-timing-equalisation');
  }

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /** Burns the same time as a real verification and always returns false. */
  async verifyDummy(plain: string): Promise<false> {
    await this.verify(this.dummyHash, plain);
    return false;
  }
}
