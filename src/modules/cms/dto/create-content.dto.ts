import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ContentType } from '../../../database/generated/prisma/client.js';

export class CreateContentDto {
  @IsEnum(ContentType)
  type!: ContentType;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}