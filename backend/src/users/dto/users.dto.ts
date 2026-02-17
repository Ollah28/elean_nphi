import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { Role } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UpsertUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsBoolean()
  canSwitchToLearnerView?: boolean;
}

export class AssignLearnerDto {
  @IsString()
  managerId!: string;

  @IsString()
  learnerId!: string;
}

export class AssignCourseDto {
  @IsString()
  learnerId!: string;

  @IsString()
  courseId!: string;
}
