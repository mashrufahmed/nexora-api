import { IsString, MaxLength } from 'class-validator';

export class AffiliateListQueryDto {
  @IsString()
  @MaxLength(100)
  siteId!: string;
}
