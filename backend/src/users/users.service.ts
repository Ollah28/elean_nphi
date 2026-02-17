import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { JwtPayload } from "../auth/jwt.types";
import { PrismaService } from "../prisma/prisma.service";
import { toFrontendUser } from "../shared/mappers";
import {
  AssignCourseDto,
  AssignLearnerDto,
  ListUsersQueryDto,
  UpsertUserDto,
} from "./dto/users.dto";

const userInclude = {
  progressRecords: true,
  certificates: true,
  managedCourses: { select: { id: true } },
  assignedLearners: { select: { id: true } },
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async listUsers(query: ListUsersQueryDto, actor: JwtPayload) {
    const where: Prisma.UserWhereInput = {
      ...(actor.role === Role.manager
        ? { role: Role.learner } // Managers only see learners by default? Or let them see all? Let's restrict to learners for now or allow all but limit actions. 
        // User request: "Manager ... specific, but more restricted, permissions". 
        // Let's allow Managers to search everyone but filtering actions.
        // Actually, previous logic restricted Manager to see ONLY Admins. 
        // Let's remove the restriction for Admin, and maybe restrict Manager.
        // Safest: Admin sees all. Manager sees all (for collaboration) or just Learners.
        // Let's go with: Admin sees all. Manager sees Learners.
        : query.role
          ? { role: query.role }
          : {}),
      ...(query.department ? { department: query.department } : {}),
    };

    // CORRECTION: Let's clean this up.
    // Admin: No extra filter.
    // Manager: No extra filter? 
    // Let's stick to the previous code structure but correct the logic.
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.department ? { department: query.department } : {}),
      // If Manager, hide Admins?
      ...(actor.role === Role.manager ? { role: { not: Role.admin } } : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: items.map(toFrontendUser),
      pagination: { page, limit, total },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: userInclude });
    if (!user) throw new NotFoundException("User not found");
    return toFrontendUser(user);
  }

  async createUser(dto: UpsertUserDto, actorRole: Role) {
    // Admin can create anyone.
    // Manager can only create Learners (and maybe Managers?).
    if (actorRole === Role.manager && dto.role === Role.admin) {
      throw new ForbiddenException("Managers cannot create Admin accounts");
    }
    // Remove the canSwitchToLearnerView restriction for Admin

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        role: dto.role,
        totalCpdPoints: 0,
        department: dto.department,
        canSwitchToLearnerView: dto.role === Role.admin ? !!dto.canSwitchToLearnerView : false,
        passwordHash: await bcrypt.hash(dto.password ?? "pass1234", 10),
      },
      include: userInclude,
    });
    return toFrontendUser(user);
  }

  async updateUser(id: string, dto: Partial<UpsertUserDto>, actor: JwtPayload) {
    const found = await this.prisma.user.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("User not found");

    // Admin can update anyone.

    // Manager restrictions
    if (actor.role === Role.manager) {
      if (found.role === Role.admin) {
        throw new ForbiddenException("Managers cannot update Admin accounts");
      }
      if (dto.role === Role.admin) {
        throw new ForbiddenException("Managers cannot promote to Admin");
      }
    }
    // Remove strict learner-view restriction for Admin

    const data: Prisma.UserUpdateInput = {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      ...(dto.department !== undefined ? { department: dto.department } : {}),
      ...(dto.role ? { role: dto.role } : {}),
      ...(dto.role && dto.role !== Role.learner ? { totalCpdPoints: 0 } : {}),
      ...(dto.canSwitchToLearnerView !== undefined
        ? {
          canSwitchToLearnerView:
            (dto.role ?? found.role) === Role.admin ? dto.canSwitchToLearnerView : false,
        }
        : {}),
      ...(dto.password ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
    };
    const user = await this.prisma.user.update({ where: { id }, data, include: userInclude });
    return toFrontendUser(user);
  }

  async deleteUser(id: string, actor: JwtPayload) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException("User not found");
    if (target.role === Role.admin && actor.role !== Role.admin) {
      throw new ForbiddenException("Only Admins can delete Admin accounts");
    }

    if (actor.role === Role.manager) {
      if (target.role === Role.admin) { // Redundant but explicit
        throw new ForbiddenException("Managers cannot delete Admin accounts");
      }
      if (target.id === actor.sub) {
        throw new ForbiddenException("Managers cannot delete their own account");
      }
    }

    await this.prisma.user.delete({ where: { id } });
  }

  async getAssignedLearners(managerId: string, actor: JwtPayload) {
    if (actor.role === Role.manager && actor.sub !== managerId) {
      throw new ForbiddenException("Managers can only view their own assigned learners");
    }
    const learners = await this.prisma.user.findMany({
      where: { assignedManagerId: managerId, role: Role.learner },
      include: userInclude,
    });
    return learners.map(toFrontendUser);
  }

  async assignLearner(dto: AssignLearnerDto, actor: JwtPayload) {
    if (actor.role === Role.manager && dto.managerId !== actor.sub) {
      throw new ForbiddenException("Managers can only assign learners to themselves");
    }
    const manager = await this.prisma.user.findUnique({ where: { id: dto.managerId } });
    if (!manager || manager.role !== Role.manager) throw new NotFoundException("Manager not found");
    const learner = await this.prisma.user.findUnique({ where: { id: dto.learnerId } });
    if (!learner || learner.role !== Role.learner) throw new NotFoundException("Learner not found");
    await this.prisma.user.update({
      where: { id: dto.learnerId },
      data: { assignedManagerId: dto.managerId },
    });
    return { success: true };
  }

  async assignCourse(dto: AssignCourseDto, actor: JwtPayload) {
    const [learner, course] = await this.prisma.$transaction([
      this.prisma.user.findUnique({ where: { id: dto.learnerId } }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
    ]);
    if (!learner || learner.role !== Role.learner) {
      throw new NotFoundException("Learner not found");
    }
    if (!course) {
      throw new NotFoundException("Course not found");
    }
    if (actor.role === Role.manager) {
      if (learner.assignedManagerId !== actor.sub) {
        throw new ForbiddenException("Managers can only assign courses to their own learners");
      }
      if (course.assignedManagerId !== actor.sub) {
        throw new ForbiddenException("Managers can only assign courses they manage");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.progress.findUnique({
        where: { userId_courseId: { userId: dto.learnerId, courseId: dto.courseId } },
      });
      if (!existing) {
        await tx.progress.create({
          data: {
            userId: dto.learnerId,
            courseId: dto.courseId,
            progress: 0,
            lastModuleIndex: 0,
            quizScores: {},
          },
        });
        await tx.course.update({
          where: { id: dto.courseId },
          data: { enrolledCount: { increment: 1 } },
        });
      }
    });
    return { success: true };
  }
}
