import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;
}
