import {
  Body,
  Controller,
  Delete,
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
import { CoursesService } from "./courses.service";
import { ListCoursesQueryDto, UpsertCourseDto } from "./dto/courses.dto";

@ApiTags("courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Query() query: ListCoursesQueryDto) {
    return this.coursesService.listCourses(query);
  }

  @Get("categories")
  categories() {
    return this.coursesService.categories();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.manager)
  @Get("manage")
  listManaged(@Query() query: ListCoursesQueryDto, @CurrentUser() actor: JwtPayload) {
    return this.coursesService.listManagedCourses(query, actor);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.manager)
  @Get("manage/categories")
  managedCategories(@CurrentUser() actor: JwtPayload) {
    return this.coursesService.categoriesForManagerOrInstructor(actor);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.coursesService.getCourse(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.manager)
  @Post()
  create(@Body() dto: UpsertCourseDto, @CurrentUser() actor: JwtPayload) {
    return this.coursesService.createCourse(dto, actor);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.manager)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: Partial<UpsertCourseDto>,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.coursesService.updateCourse(id, dto, actor);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.manager)
  @Delete(":id")
  async delete(@Param("id") id: string, @CurrentUser() actor: JwtPayload) {
    await this.coursesService.deleteCourse(id, actor);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.learner)
  @Post(":id/enroll")
  enroll(@Param("id") courseId: string, @CurrentUser() user: JwtPayload) {
    return this.coursesService.enroll(courseId, user.sub);
  }
}
