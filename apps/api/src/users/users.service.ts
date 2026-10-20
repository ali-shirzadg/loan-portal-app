import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@loan-portal/shared';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface NewUser {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.toLowerCase() });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /** Throws the driver's duplicate-key error if the email exists; callers map it. */
  create(data: NewUser): Promise<User> {
    return this.users.save(this.users.create(data));
  }
}
