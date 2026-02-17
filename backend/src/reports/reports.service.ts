import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtPayload } from "../auth/jwt.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getInstructorCourseIds(actor: JwtPayload) {
    const actorUser = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { name: true, email: true },
    });
    if (!actorUser) return [];
    const rows = await this.prisma.course.findMany({
      where: {
        OR: [{ instructor: actorUser.name }, { instructor: actorUser.email }],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async overview(actor: JwtPayload, managerId?: string) {
    const instructorCourseIds = actor.role === Role.admin ? await this.getInstructorCourseIds(actor) : [];
    const learnerFilter = managerId
      ? { role: "learner" as const, assignedManagerId: managerId }
      : actor.role === Role.admin
        ? {
            role: "learner" as const,
            progressRecords: {
              some: { courseId: { in: instructorCourseIds } },
            },
          }
        : { role: "learner" as const };

    const learnersList = await this.prisma.user.findMany({
      where: learnerFilter,
      select: { id: true, totalCpdPoints: true },
    });
    const learnerIds = learnersList.map((u) => u.id);

    const [totalUsers, courses, enrollments, certificates, activeUsersCount, allCourses] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: learnerFilter }),
        this.prisma.course.count({
          where: managerId
            ? { assignedManagerId: managerId }
            : actor.role === Role.admin
              ? { id: { in: instructorCourseIds } }
              : undefined,
        }),
        this.prisma.progress.count({
          where: managerId
            ? { userId: { in: learnerIds } }
            : actor.role === Role.admin
              ? { courseId: { in: instructorCourseIds } }
              : undefined,
        }),
        this.prisma.certificate.count({
          where: managerId
            ? { userId: { in: learnerIds } }
            : actor.role === Role.admin
              ? { courseId: { in: instructorCourseIds } }
              : undefined,
        }),
        this.prisma.user.count({
          where: {
            ...learnerFilter,
            OR: [{ progressRecords: { some: {} } }, { certificates: { some: {} } }],
          },
        }),
        this.prisma.course.findMany({
          where: managerId
            ? { assignedManagerId: managerId }
            : actor.role === Role.admin
              ? { id: { in: instructorCourseIds } }
              : undefined,
          select: {
            title: true,
            category: true,
            enrolledCount: true,
            progressRecords: managerId
              ? { where: { userId: { in: learnerIds } }, select: { progress: true } }
              : actor.role === Role.admin
                ? { where: { courseId: { in: instructorCourseIds } }, select: { progress: true } }
              : { select: { progress: true } },
          },
        }),
      ]);

    const progressEvents = await this.prisma.progress.findMany({
      where: managerId
        ? { userId: { in: learnerIds } }
        : actor.role === Role.admin
          ? { courseId: { in: instructorCourseIds } }
          : undefined,
      select: { createdAt: true },
    });
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const enrollmentByMonthCounts = new Array<number>(12).fill(0);
    progressEvents.forEach((event) => {
      enrollmentByMonthCounts[event.createdAt.getMonth()] += 1;
    });
    const enrollmentByMonth = monthLabels.map((month, index) => ({
      month,
      enrollments: enrollmentByMonthCounts[index],
    }));

    const completionRates = allCourses
      .map((course) => {
        const total = course.progressRecords.length;
        const completed = course.progressRecords.filter((p) => p.progress >= 100).length;
        return {
          course: course.title,
          rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);

    const categoryMap = new Map<string, number>();
    allCourses.forEach((course) => {
      const current = categoryMap.get(course.category) ?? 0;
      categoryMap.set(course.category, current + course.enrolledCount);
    });
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);

    const totalCpdPoints =
      actor.role === Role.admin ? 0 : learnersList.reduce((sum, learner) => sum + learner.totalCpdPoints, 0);
    const averageCpdPoints = actor.role === Role.admin ? 0 : totalUsers > 0 ? Math.round(totalCpdPoints / totalUsers) : 0;

    return {
      learners: totalUsers,
      courses,
      enrollments,
      completionRate: enrollments > 0 ? Math.round((certificates / enrollments) * 100) : 0,
      totalCpdPoints,
      enrollmentByMonth,
      completionRates,
      categoryDistribution,
      cpdGrowth: enrollmentByMonth.map((item, index, arr) => ({
        month: item.month,
        points: arr.slice(0, index + 1).reduce((sum, row) => sum + row.enrollments, 0),
      })),
      userStats: {
        totalUsers,
        activeUsers: activeUsersCount,
        coursesCompleted: certificates,
        averageCpdPoints,
      },
    };
  }

  async learners(actor: JwtPayload, managerId?: string) {
    const instructorCourseIds = actor.role === Role.admin ? await this.getInstructorCourseIds(actor) : [];
    const users = await this.prisma.user.findMany({
      where: {
        role: "learner",
        ...(managerId ? { assignedManagerId: managerId } : {}),
        ...(actor.role === Role.admin
          ? {
              progressRecords: {
                some: { courseId: { in: instructorCourseIds } },
              },
            }
          : {}),
      },
      include: {
        progressRecords:
          actor.role === Role.admin
            ? { where: { courseId: { in: instructorCourseIds } } }
            : true,
        certificates:
          actor.role === Role.admin
            ? { where: { courseId: { in: instructorCourseIds } } }
            : true,
      },
    });
    return users.map((u) => {
      const completion =
        u.progressRecords.length > 0
          ? Math.round(
              u.progressRecords.reduce((acc, p) => acc + p.progress, 0) /
                u.progressRecords.length,
            )
          : 0;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        completion,
        cpd: actor.role === Role.admin ? 0 : u.totalCpdPoints,
        completedCourses: u.certificates.length,
      };
    });
  }

  async courses(actor: JwtPayload, managerId?: string) {
    const instructorCourseIds = actor.role === Role.admin ? await this.getInstructorCourseIds(actor) : [];
    const courses = await this.prisma.course.findMany({
      where: managerId
        ? { assignedManagerId: managerId }
        : actor.role === Role.admin
          ? { id: { in: instructorCourseIds } }
          : undefined,
      include: {
        progressRecords: managerId
          ? {
              where: {
                user: {
                  assignedManagerId: managerId,
                },
              },
            }
          : actor.role === Role.admin
            ? {
                where: {
                  courseId: { in: instructorCourseIds },
                },
              }
          : true,
      },
      orderBy: { enrolledCount: "desc" },
    });
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      enrollment: c.enrolledCount,
      avgRating: c.rating,
      avgProgress:
        c.progressRecords.length > 0
          ? Math.round(
              c.progressRecords.reduce((acc, p) => acc + p.progress, 0) /
                c.progressRecords.length,
            )
          : 0,
    }));
  }
}
