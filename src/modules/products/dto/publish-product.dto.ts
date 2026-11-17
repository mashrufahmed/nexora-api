import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishProductDto {
  @IsString() siteId!: string;
  @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
}