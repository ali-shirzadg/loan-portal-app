import { Role } from './role.enum';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
