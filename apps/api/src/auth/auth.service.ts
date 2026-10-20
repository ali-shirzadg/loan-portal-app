import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto, Role } from '@loan-portal/shared';
import { isDuplicateKeyError } from '../common/db-errors';
import type { JwtPayload } from '../common/types/auth-user';
import type { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export interface AuthResult {
  user: User;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  /** FR-AUTH-1: always creates a CUSTOMER; the role is never read from input. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const user = await this.users.create({
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: Role.CUSTOMER,
      });
      return { user, token: await this.issueToken(user) };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  /** FR-AUTH-2: one message and one cost for unknown email and wrong password. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    const valid = user
      ? await this.passwords.verify(user.passwordHash, dto.password)
      : await this.passwords.verifyDummy(dto.password);
    if (!user || !valid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }
    return { user, token: await this.issueToken(user) };
  }

  async currentUser(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedException('Authentication required');
    return user;
  }

  private issueToken(user: User): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwt.signAsync(payload);
  }
}
