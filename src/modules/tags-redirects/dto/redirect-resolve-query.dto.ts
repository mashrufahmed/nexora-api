import { IsString } from 'class-validator';

export class RedirectResolveQueryDto {
  @IsString() siteId!: string;
  @IsString() path!: string;
}
