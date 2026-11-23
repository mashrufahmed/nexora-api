import { IsIn, IsUUID } from 'class-validator';

export class IdParamDto {
  @IsUUID()
  id!: string;
}

export class RevisionParamDto extends IdParamDto {
  @IsUUID()
  revisionId!: string;
}

export class PublicationParamDto extends IdParamDto {
  @IsUUID()
  publicationId!: string;
}

export class DomainParamDto extends IdParamDto {
  @IsUUID()
  domainId!: string;
}

export class SecretParamDto extends IdParamDto {
  @IsUUID()
  secretId!: string;
}

export class StatusParamDto extends IdParamDto {
  @IsIn(['IN_REVIEW', 'PUBLISHED', 'ARCHIVED'])
  status!: 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
}
