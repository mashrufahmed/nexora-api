import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestChangesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}