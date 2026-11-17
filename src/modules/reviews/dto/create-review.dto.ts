import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ReviewScoreDto {
  @IsString() criterionId!: string;
  @IsNumber() @Min(0) score!: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class CreateReviewDto {
  @IsString() siteProductId!: string;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) verdict?: string;
  @IsOptional() @IsObject() body?: Record<string, unknown>;
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReviewScoreDto)
  scores!: ReviewScoreDto[];
}
