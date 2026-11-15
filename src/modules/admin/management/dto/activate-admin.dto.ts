import { ArrayNotEmpty, IsArray, IsString, MaxLength } from 'class-validator';

export class ActivateAdminDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  roleIds: string[];
}
