import { IsBase64, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UploadMediaDto {
  @IsOptional() @IsString() siteId?: string;
  @IsString() @MaxLength(255) originalFilename!: string;
  @IsString() mimeType!: string;
  @IsBase64() data!: string;
  @IsOptional() @IsString() @MaxLength(500) alt?: string;
  @IsOptional() @IsString() @MaxLength(500) caption?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(1) @Max(20000) width?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20000) height?: number;
}