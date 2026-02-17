import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JwtPayload } from "../auth/jwt.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UsersService } from "./users.service";
import {
  AssignCourseDto,
  AssignLearnerDto,
  ListUsersQueryDto,
  UpsertUserDto,
} from "./dto/users.dto";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(Role.manager, Role.admin)
  listUsers(@Query() query: ListUsersQueryDto, @CurrentUser() actor: JwtPayload) {
    return this.usersService.listUsers(query, actor);
  }

  @Get(":id")
  @Roles(Role.manager, Role.admin)
  getUser(@Param("id") id: string) {
    return this.usersService.getUser(id);
  }

  @Post()
  @Roles(Role.manager, Role.admin)
  createUser(@Body() dto: UpsertUserDto, @CurrentUser() actor: JwtPayload) {
    return this.usersService.createUser(dto, actor.role);
  }

  @Patch(":id")
  @Roles(Role.manager, Role.admin)
  updateUser(@Param("id") id: string, @Body() dto: Partial<UpsertUserDto>, @CurrentUser() actor: JwtPayload) {
    return this.usersService.updateUser(id, dto, actor);
  }

  @Delete(":id")
  @Roles(Role.manager, Role.admin)
  async deleteUser(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    await this.usersService.deleteUser(id, actor);
    return { success: true };
  }

  @Get(":id/assigned-learners")
  @Roles(Role.manager, Role.admin)
  assignedLearners(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    return this.usersService.getAssignedLearners(id, actor);
  }

  @Post(":id/assign-learner")
  @Roles(Role.manager, Role.admin)
  assignLearner(
    @Param("id") id: string,
    @Body() dto: AssignLearnerDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    if (id !== dto.managerId) {
      throw new ForbiddenException("Manager id in path must match request body");
    }
    return this.usersService.assignLearner(dto, actor);
  }

  @Post(":id/assign-course")
  @Roles(Role.manager, Role.admin)
  assignCourse(
    @Param("id") id: string,
    @Body() dto: AssignCourseDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    if (actor.role === Role.manager && id !== actor.sub) {
      throw new ForbiddenException("Managers can only assign courses under their own account path");
    }
    return this.usersService.assignCourse(dto, actor);
  }
}
