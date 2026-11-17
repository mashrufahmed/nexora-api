import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(120) modelNumber?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsObject() specifications?: Record<string, unknown>;
}