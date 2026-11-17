import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AuthorAssignmentDto { @IsString() authorId!: string; @IsInt() @Min(0) position!: number; }
export class AssignAuthorsDto { @IsArray() @ValidateNested({ each: true }) @Type(() => AuthorAssignmentDto) authors!: AuthorAssignmentDto[]; }