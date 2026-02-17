import { NotificationType, Role } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  message!: string;

  @IsArray()
  @IsEnum(Role, { each: true })
  targetRoles!: Role[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
