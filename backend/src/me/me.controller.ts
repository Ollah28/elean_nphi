import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/jwt.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CompleteCourseDto, SubmitAssignmentDto, UpdateMyProfileDto, UpdateProgressDto } from "./dto/me.dto";
import { MeService } from "./me.service";

@ApiTags("me")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("me")
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  me(@CurrentUser() user: JwtPayload) {
    return this.meService.me(user.sub);
  }

  @Patch("profile")
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
    return this.meService.updateProfile(user.sub, dto);
  }

  @Get("progress")
  @Roles(Role.learner)
  progress(@CurrentUser() user: JwtPayload) {
    return this.meService.getProgress(user.sub);
  }

  @Put("progress/:courseId")
  @Roles(Role.learner)
  updateProgress(
    @CurrentUser() user: JwtPayload,
    @Param("courseId") courseId: string,
    @Body() dto: Partial<UpdateProgressDto>,
  ) {
    return this.meService.updateProgress(user.sub, courseId, dto);
  }

  @Post("complete-course")
  @Roles(Role.learner)
  completeCourse(@CurrentUser() user: JwtPayload, @Body() dto: CompleteCourseDto) {
    return this.meService.completeCourse(user.sub, dto);
  }

  @Get("certificates")
  @Roles(Role.learner)
  certificates(@CurrentUser() user: JwtPayload) {
    return this.meService.certificates(user.sub);
  }

  @Get("assignments/:moduleId")
  @Roles(Role.learner)
  assignment(@CurrentUser() user: JwtPayload, @Param("moduleId") moduleId: string) {
    return this.meService.getAssignmentSubmission(user.sub, moduleId);
  }

  @Post("assignments/submit")
  @Roles(Role.learner)
  submitAssignment(@CurrentUser() user: JwtPayload, @Body() dto: SubmitAssignmentDto) {
    return this.meService.submitAssignment(user.sub, dto);
  }
}
