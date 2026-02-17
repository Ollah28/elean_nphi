import { IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;

  @IsInt()
  @Min(0)
  lastModuleIndex!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lastVideoTime?: number;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsObject()
  quizScores!: Record<string, number>;
}

export class CompleteCourseDto {
  @IsString()
  courseId!: string;

  @IsString()
  courseName!: string;

  @IsInt()
  @Min(0)
  cpdPoints!: number;
}

export class SubmitAssignmentDto {
  @IsString()
  courseId!: string;

  @IsString()
  moduleId!: string;

  @IsString()
  content!: string;
}

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
