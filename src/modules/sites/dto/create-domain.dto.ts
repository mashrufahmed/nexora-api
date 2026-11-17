import { IsBoolean, IsFQDN, IsOptional, MaxLength } from 'class-validator';

export class CreateDomainDto {
  @IsFQDN()
  @MaxLength(253)
  hostname!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
