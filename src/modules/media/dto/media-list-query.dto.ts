import { IsOptional, IsString } from 'class-validator';

export class MediaListQueryDto {
  @IsOptional() @IsString() siteId?: string;
  @IsOptional() @IsString() search?: string;
}
