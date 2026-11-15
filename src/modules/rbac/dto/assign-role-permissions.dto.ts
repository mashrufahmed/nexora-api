import { ArrayNotEmpty, IsArray, IsString, MaxLength } from 'class-validator';

export class AssignRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  permissionIds: string[];
}
