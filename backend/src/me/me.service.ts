import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  toFrontendCertificate,
  toFrontendProgress,
  toFrontendUser,
} from "../shared/mappers";
import { CompleteCourseDto, SubmitAssignmentDto, UpdateMyProfileDto, UpdateProgressDto } from "./dto/me.dto";

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        progressRecords: true,
        certificates: true,
        managedCourses: { select: { id: true } },
        assignedLearners: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return toFrontendUser(user);
  }

  async updateProfile(userId: string, dto: UpdateMyProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
      },
      include: {
        progressRecords: true,
        certificates: true,
        managedCourses: { select: { id: true } },
        assignedLearners: { select: { id: true } },
      },
    });
    return toFrontendUser(updated);
  }

  async getProgress(userId: string) {
    const records = await this.prisma.progress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return records.map(toFrontendProgress);
  }

  async updateProgress(userId: string, courseId: string, dto: Partial<UpdateProgressDto>) {
    const progress = await this.prisma.progress.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        progress: dto.progress ?? 0,
        lastModuleIndex: dto.lastModuleIndex ?? 0,
        lastVideoTime: dto.lastVideoTime,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        quizScores: dto.quizScores ?? {},
      },
      update: {
        ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
        ...(dto.lastModuleIndex !== undefined ? { lastModuleIndex: dto.lastModuleIndex } : {}),
        ...(dto.lastVideoTime !== undefined ? { lastVideoTime: dto.lastVideoTime } : {}),
        ...(dto.quizScores !== undefined ? { quizScores: dto.quizScores } : {}),
        ...(dto.startedAt !== undefined ? { startedAt: new Date(dto.startedAt) } : {}),
        ...(dto.completedAt !== undefined
          ? { completedAt: dto.completedAt ? new Date(dto.completedAt) : null }
          : {}),
      },
    });
    return toFrontendProgress(progress);
  }

  async completeCourse(userId: string, dto: CompleteCourseDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.progress.upsert({
        where: { userId_courseId: { userId, courseId: dto.courseId } },
        create: {
          userId,
          courseId: dto.courseId,
          progress: 100,
          lastModuleIndex: 0,
          completedAt: new Date(),
          quizScores: {},
        },
        update: {
          progress: 100,
          completedAt: new Date(),
        },
      });

      const existing = await tx.certificate.findFirst({
        where: { userId, courseId: dto.courseId },
      });
      if (!existing) {
        await tx.certificate.create({
          data: {
            userId,
            courseId: dto.courseId,
            courseName: dto.courseName,
            cpdPoints: dto.cpdPoints,
          },
        });
        await tx.user.update({
          where: { id: userId },
          data: { totalCpdPoints: { increment: dto.cpdPoints } },
        });
      }
    });

    return this.me(userId);
  }

  async certificates(userId: string) {
    const certs = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
    });
    return certs.map(toFrontendCertificate);
  }

  async getAssignmentSubmission(userId: string, moduleId: string) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { userId_moduleId: { userId, moduleId } },
    });
    if (!submission) return null;
    return {
      id: submission.id,
      courseId: submission.courseId,
      moduleId: submission.moduleId,
      content: submission.content,
      submittedAt: submission.submittedAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    };
  }

  async submitAssignment(userId: string, dto: SubmitAssignmentDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: dto.moduleId },
      select: { id: true, courseId: true, type: true },
    });
    if (!module || module.courseId !== dto.courseId) {
      throw new NotFoundException("Assignment module not found");
    }
    if (module.type !== "assignment") {
      throw new ForbiddenException("Submissions are only allowed for assignment modules");
    }

    const enrolled = await this.prisma.progress.findUnique({
      where: { userId_courseId: { userId, courseId: dto.courseId } },
    });
    if (!enrolled) {
      throw new ForbiddenException("You must be enrolled in this course before submitting assignments");
    }

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { userId_moduleId: { userId, moduleId: dto.moduleId } },
      create: {
        userId,
        courseId: dto.courseId,
        moduleId: dto.moduleId,
        content: dto.content,
      },
      update: {
        content: dto.content,
        submittedAt: new Date(),
      },
    });

    return {
      id: submission.id,
      courseId: submission.courseId,
      moduleId: submission.moduleId,
      content: submission.content,
      submittedAt: submission.submittedAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
    };
  }
}
