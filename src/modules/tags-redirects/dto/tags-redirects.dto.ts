import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
export class TagDto {
  @IsString() siteId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() slug!: string;
}
export class UpdateTagDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() slug?: string;
}
export class RedirectDto {
  @IsString() siteId!: string;
  @IsString() fromPath!: string;
  @IsString() toPath!: string;
  @IsInt() @Min(301) @Max(308) statusCode!: number;
}
export class UpdateRedirectDto {
  @IsOptional() @IsString() fromPath?: string;
  @IsOptional() @IsString() toPath?: string;
  @IsOptional() @IsInt() @Min(301) @Max(308) statusCode?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
