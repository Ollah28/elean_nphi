import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/jwt.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.manager, Role.admin)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("overview")
  overview(@CurrentUser() actor: JwtPayload, @Query("managerId") managerId?: string) {
    const scopedManagerId = actor.role === Role.manager ? actor.sub : managerId;
    return this.reportsService.overview(actor, scopedManagerId);
  }

  @Get("learners")
  learners(@CurrentUser() actor: JwtPayload, @Query("managerId") managerId?: string) {
    const scopedManagerId = actor.role === Role.manager ? actor.sub : managerId;
    return this.reportsService.learners(actor, scopedManagerId);
  }

  @Get("courses")
  courses(@CurrentUser() actor: JwtPayload) {
    const scopedManagerId = actor.role === Role.manager ? actor.sub : undefined;
    return this.reportsService.courses(actor, scopedManagerId);
  }
}
