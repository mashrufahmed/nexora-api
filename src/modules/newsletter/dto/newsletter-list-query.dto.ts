import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class NewsletterListQueryDto {
  @IsString() siteId!: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit = 50;
}