import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCriterionDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsNumber() @Min(0.001) weight!: number;
  @IsOptional() @IsNumber() @Min(0) position?: number;
}
