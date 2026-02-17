import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { JwtPayload } from "../auth/jwt.types";
import { PrismaService } from "../prisma/prisma.service";
import { toFrontendCourse } from "../shared/mappers";
import { ListCoursesQueryDto, UpsertCourseDto } from "./dto/courses.dto";

const includeCourse = {
  modules: { include: { questions: true }, orderBy: { position: "asc" } },
} satisfies Prisma.CourseInclude;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) { }

  private async getActorCourseScope(actor: JwtPayload): Promise<Prisma.CourseWhereInput> {
    // Admin (Superuser) sees ALL courses
    if (actor.role === Role.admin) {
      return {};
    }

    if (actor.role === Role.manager) {
      return { assignedManagerId: actor.sub };
    }
    const actorUser = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { name: true, email: true },
    });
    if (!actorUser) throw new NotFoundException("User not found");
    return {
      OR: [{ instructor: actorUser.name }, { instructor: actorUser.email }],
    };
  }

  async listCourses(query: ListCoursesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.CourseWhereInput = {
      ...(query.search
        ? {
          OR: [
            { title: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { category: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.level ? { level: query.level } : {}),
    };

    const orderBy =
      query.sort === "rating"
        ? { rating: "desc" as const }
        : query.sort === "enrolledCount"
          ? { enrolledCount: "desc" as const }
          : { createdAt: "desc" as const };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: includeCourse,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: items.map(toFrontendCourse),
      pagination: { page, limit, total },
    };
  }

  async listManagedCourses(query: ListCoursesQueryDto, actor: JwtPayload) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const scopeWhere = await this.getActorCourseScope(actor);
    const where: Prisma.CourseWhereInput = {
      ...scopeWhere,
      ...(query.search
        ? {
          OR: [
            { title: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { category: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.level ? { level: query.level } : {}),
    };

    const orderBy =
      query.sort === "rating"
        ? { rating: "desc" as const }
        : query.sort === "enrolledCount"
          ? { enrolledCount: "desc" as const }
          : { createdAt: "desc" as const };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        include: includeCourse,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: items.map(toFrontendCourse),
      pagination: { page, limit, total },
    };
  }

  async getCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id }, include: includeCourse });
    if (!course) throw new NotFoundException("Course not found");
    return toFrontendCourse(course);
  }

  async createCourse(dto: UpsertCourseDto, actor: JwtPayload) {
    if (actor.role === Role.admin) {
      const actorUser = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { name: true, email: true },
      });
      if (!actorUser) throw new NotFoundException("User not found");
      dto.instructor = actorUser.name || actorUser.email;
    }
    if (actor.role === Role.manager) {
      if (dto.assignedManagerId && dto.assignedManagerId !== actor.sub) {
        throw new ForbiddenException("Managers can only create courses assigned to themselves");
      }
      dto.assignedManagerId = actor.sub;
    }
    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        thumbnail: dto.thumbnail,
        instructor: dto.instructor,
        category: dto.category,
        duration: dto.duration,
        cpdPoints: dto.cpdPoints,
        enrolledCount: dto.enrolledCount,
        rating: dto.rating,
        level: dto.level,
        assignedManagerId: dto.assignedManagerId,
        modules: {
          create: dto.modules.map((m, idx) => ({
            title: m.title,
            type: m.type,
            content: m.content,
            slidesUrl: m.slidesUrl,
            duration: m.duration,
            position: idx,
            completed: m.completed,
            questions: m.questions
              ? {
                create: m.questions.map((q, qIdx) => ({
                  question: q.question,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                  position: qIdx,
                })),
              }
              : undefined,
          })),
        },
      },
      include: includeCourse,
    });
    return toFrontendCourse(course);
  }

  async updateCourse(id: string, dto: Partial<UpsertCourseDto>, actor: JwtPayload) {
    const existing = await this.prisma.course.findUnique({ where: { id }, include: includeCourse });
    if (!existing) throw new NotFoundException("Course not found");
    if (actor.role === Role.manager && existing.assignedManagerId !== actor.sub) {
      throw new ForbiddenException("Managers can only update courses they manage");
    }
    if (actor.role === Role.admin) {
      const actorUser = await this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: { name: true, email: true },
      });
      if (!actorUser) throw new NotFoundException("User not found");
      if (existing.instructor !== actorUser.name && existing.instructor !== actorUser.email) {
        throw new ForbiddenException("Instructors can only update courses they manage");
      }
      dto.instructor = actorUser.name || actorUser.email;
    }
    if (actor.role === Role.manager && dto.assignedManagerId && dto.assignedManagerId !== actor.sub) {
      throw new ForbiddenException("Managers cannot reassign course ownership");
    }

    const finalCourse = await this.prisma.$transaction(async (tx) => {
      if (dto.modules) {
        await tx.quizQuestion.deleteMany({ where: { module: { courseId: id } } });
        await tx.module.deleteMany({ where: { courseId: id } });
      }

      await tx.course.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.thumbnail !== undefined ? { thumbnail: dto.thumbnail } : {}),
          ...(dto.instructor !== undefined ? { instructor: dto.instructor } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
          ...(dto.cpdPoints !== undefined ? { cpdPoints: dto.cpdPoints } : {}),
          ...(dto.enrolledCount !== undefined ? { enrolledCount: dto.enrolledCount } : {}),
          ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
          ...(dto.level !== undefined ? { level: dto.level } : {}),
          ...(dto.assignedManagerId !== undefined ? { assignedManagerId: dto.assignedManagerId } : {}),
          ...(actor.role === Role.manager ? { assignedManagerId: actor.sub } : {}),
        },
      });

      if (dto.modules) {
        for (let i = 0; i < dto.modules.length; i++) {
          const m = dto.modules[i];
          await tx.module.create({
            data: {
              id: m.id,
              courseId: id,
              title: m.title,
              type: m.type,
              content: m.content,
              slidesUrl: m.slidesUrl,
              duration: m.duration,
              completed: m.completed,
              position: i,
              questions: m.questions
                ? {
                  create: m.questions.map((q, qIdx) => ({
                    id: q.id,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    position: qIdx,
                  })),
                }
                : undefined,
            },
          });
        }
      }

      return tx.course.findUnique({
        where: { id },
        include: includeCourse,
      });
    });
    if (!finalCourse) throw new NotFoundException("Course not found");
    return toFrontendCourse(finalCourse);
  }

  async deleteCourse(id: string, actor: JwtPayload) {
    // Admin (Superuser) can delete ANY course
    if (actor.role === Role.admin) {
      await this.prisma.course.delete({ where: { id } });
      return;
    }

    if (actor.role === Role.manager) {
      const course = await this.prisma.course.findUnique({ where: { id }, select: { assignedManagerId: true } });
      if (!course) throw new NotFoundException("Course not found");
      if (course.assignedManagerId !== actor.sub) {
        throw new ForbiddenException("Managers can only delete courses they manage");
      }
      await this.prisma.course.delete({ where: { id } });
      return;
    }

    throw new ForbiddenException("You do not have permission to delete courses");
  }

  async categories() {
    const rows = await this.prisma.course.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return ["All", ...rows.map((r) => r.category)];
  }

  async categoriesForManagerOrInstructor(actor: JwtPayload) {
    const where = await this.getActorCourseScope(actor);
    const rows = await this.prisma.course.findMany({
      where,
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return ["All", ...rows.map((r) => r.category)];
  }

  async enroll(courseId: string, userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!currentUser) {
      throw new NotFoundException("User not found");
    }
    if (currentUser.role === Role.admin) {
      throw new ForbiddenException("Instructors cannot enroll in courses");
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.progress.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing) return existing;
      await tx.course.update({
        where: { id: courseId },
        data: { enrolledCount: { increment: 1 } },
      });
      return tx.progress.create({
        data: {
          userId,
          courseId,
          progress: 0,
          lastModuleIndex: 0,
          quizScores: {},
        },
      });
    });
  }
}
