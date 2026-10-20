import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@loan-portal/shared';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService, INVALID_CREDENTIALS_MESSAGE } from './auth.service';
import { PasswordService } from './password.service';

function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: 'u-1',
    email: 'a@loanportal.test',
    passwordHash: 'hash',
    fullName: 'Test User',
    role: Role.CUSTOMER,
    ...overrides,
  });
}

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
    verifyDummy: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    jwt.signAsync.mockResolvedValue('signed-token');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PasswordService, useValue: passwords },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('register (FR-AUTH-1)', () => {
    it('hashes the password and always creates a CUSTOMER', async () => {
      passwords.hash.mockResolvedValue('argon-hash');
      users.create.mockImplementation((data) =>
        Promise.resolve(makeUser(data)),
      );

      const result = await service.register({
        email: 'a@loanportal.test',
        password: 'a-long-enough-password',
        fullName: 'Test User',
      });

      expect(users.create).toHaveBeenCalledWith({
        email: 'a@loanportal.test',
        passwordHash: 'argon-hash',
        fullName: 'Test User',
        role: Role.CUSTOMER,
      });
      expect(result.token).toBe('signed-token');
    });

    it('maps a duplicate email to 409', async () => {
      passwords.hash.mockResolvedValue('argon-hash');
      users.create.mockRejectedValue({ driverError: { code: 'ER_DUP_ENTRY' } });

      await expect(
        service.register({
          email: 'a@loanportal.test',
          password: 'a-long-enough-password',
          fullName: 'Test User',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login (FR-AUTH-2)', () => {
    it('returns the user and a token for valid credentials', async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(true);

      const result = await service.login({
        email: 'a@loanportal.test',
        password: 'pw',
      });

      expect(result.user.id).toBe('u-1');
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u-1',
        role: Role.CUSTOMER,
      });
    });

    it('gives the same generic 401 for a wrong password and an unknown email', async () => {
      users.findByEmail.mockResolvedValueOnce(makeUser());
      passwords.verify.mockResolvedValueOnce(false);
      const wrongPassword = await service
        .login({ email: 'a@loanportal.test', password: 'bad' })
        .catch((e: unknown) => e);

      users.findByEmail.mockResolvedValueOnce(null);
      passwords.verifyDummy.mockResolvedValueOnce(false);
      const unknownEmail = await service
        .login({ email: 'nobody@loanportal.test', password: 'bad' })
        .catch((e: unknown) => e);

      for (const error of [wrongPassword, unknownEmail]) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe(
          INVALID_CREDENTIALS_MESSAGE,
        );
      }
      // Unknown email still pays for one password verification.
      expect(passwords.verifyDummy).toHaveBeenCalledTimes(1);
    });
  });
});
