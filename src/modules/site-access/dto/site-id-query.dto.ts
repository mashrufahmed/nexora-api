import { IsString } from 'class-validator';

export class SiteIdQueryDto {
  @IsString() siteId!: string;
}
