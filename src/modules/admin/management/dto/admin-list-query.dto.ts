import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { Type } from 'class-transformer';
import { AdminStatus } from '../../../../database/generated/prisma/enums.js';

export class AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AdminStatus)
  status?: AdminStatus;
}
