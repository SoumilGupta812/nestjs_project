import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @Transform(({ value }) => value.trim())
  @IsNotEmpty({ message: 'Title is required.' })
  @IsString({ message: 'Title must be a string.' })
  @MinLength(3, { message: 'Title must be at least 3 characters long.' })
  @MaxLength(50, { message: 'Title must be at most 50 characters long.' })
  title: string;

  @Transform(({ value }) => value.trim())
  @IsNotEmpty({ message: 'Content is required.' })
  @IsString({ message: 'Content must be a string.' })
  @MinLength(3, { message: 'Content must be at least 3 characters long.' })
  content: string;

  @Transform(({ value }) => value.trim())
  @IsNotEmpty({ message: 'Author name is required.' })
  @IsString({ message: 'Author name must be a string.' })
  @MinLength(3, { message: 'Author name must be at least 3 characters long.' })
  @MaxLength(50, { message: 'Author name must be at most 50 characters long.' })
  authorName: string;
}
