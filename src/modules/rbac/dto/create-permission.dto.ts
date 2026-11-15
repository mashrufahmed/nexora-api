import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, {
    message: 'Permission code format is invalid',
  })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, {
    message: 'Permission module format is invalid',
  })
  module: string;
}
