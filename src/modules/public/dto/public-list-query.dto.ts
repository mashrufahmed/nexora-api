import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PublicListQueryDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(50) limit = 20;
}