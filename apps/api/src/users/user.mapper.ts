import type { UserDto } from '@loan-portal/shared';
import type { User } from './user.entity';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };
}
