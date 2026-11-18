import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
export class GuideDto {
  @IsString() siteId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() body?: Record<string, unknown>;
}
export class GuideItemsDto {
  @IsArray() items!: Array<{
    siteProductId: string;
    position: number;
    note?: string;
  }>;
}
