import { IsEnum } from 'class-validator';
import { AdminStatus } from '../../../../database/generated/prisma/enums.js';

export class UpdateAdminStatusDto {
  @IsEnum(AdminStatus)
  status: AdminStatus;
}
