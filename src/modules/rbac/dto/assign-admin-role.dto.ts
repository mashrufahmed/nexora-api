import { ArrayNotEmpty, IsArray, IsString, MaxLength } from 'class-validator';

export class AssignAdminRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  roleIds: string[];
}
