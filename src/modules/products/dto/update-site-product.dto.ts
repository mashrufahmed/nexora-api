import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSiteProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) slug?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}