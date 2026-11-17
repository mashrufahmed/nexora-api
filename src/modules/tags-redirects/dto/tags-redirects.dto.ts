import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';
export class TagDto {
  @IsString() siteId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() slug!: string;
}
export class RedirectDto {
  @IsString() siteId!: string;
  @IsString() fromPath!: string;
  @IsString() toPath!: string;
  @IsInt() @Min(301) @Max(308) statusCode!: number;
}
