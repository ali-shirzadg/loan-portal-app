// class-transformer's @Type needs the Reflect metadata polyfill (also in the browser).
import 'reflect-metadata';

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApplicationStatus } from './application-status.enum';

export class ListApplicationsQueryDto {
  // The explicit `: number` lets the OpenAPI plugin read the type.
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  /** Honoured for admins only. */
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
