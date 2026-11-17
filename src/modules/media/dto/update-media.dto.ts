import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMediaDto {
  @IsOptional() @IsString() @MaxLength(500) alt?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}