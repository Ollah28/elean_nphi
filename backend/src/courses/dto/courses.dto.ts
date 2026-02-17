import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class ListCoursesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number = 20;
}

export class UpsertCourseDto {
  @IsString()
  title!: string;
  @IsString()
  description!: string;
  @IsString()
  thumbnail!: string;
  @IsString()
  instructor!: string;
  @IsString()
  category!: string;
  @IsString()
  duration!: string;
  @IsInt()
  cpdPoints!: number;
  @IsNumber()
  rating!: number;
  @IsInt()
  enrolledCount!: number;
  @IsString()
  level!: "Beginner" | "Intermediate" | "Advanced";
  @IsOptional()
  @IsString()
  assignedManagerId?: string;
  @IsArray()
  modules!: Array<{
    id?: string;
    title: string;
    type: "video" | "pdf" | "ppt" | "word" | "quiz" | "assignment";
    content: string;
    slidesUrl?: string;
    duration?: number;
    questions?: Array<{ id?: string; question: string; options: string[]; correctAnswer: number }>;
    completed?: boolean;
  }>;
}

export class EnrollDto {
  @IsString()
  courseId!: string;
}
