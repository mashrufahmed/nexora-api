import { IsDateString, IsString } from 'class-validator';
export class ScheduleContentDto {
  @IsString() siteId!: string;
  @IsDateString() scheduledAt!: string;
}
