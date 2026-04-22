import { IsOptional, IsString, Max } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  @Max(500)
  description?: string;
}
