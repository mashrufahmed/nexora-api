import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
