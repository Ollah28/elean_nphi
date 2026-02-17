import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { toFrontendNotification } from "../shared/mappers";
import { CreateNotificationDto } from "./dto/notifications.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForRole(role: Role) {
    const now = new Date();
    const items = await this.prisma.notification.findMany({
      where: {
        targetRoles: { has: role },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return items.map(toFrontendNotification);
  }

  async create(dto: CreateNotificationDto) {
    const created = await this.prisma.notification.create({
      data: {
        type: dto.type,
        message: dto.message,
        targetRoles: dto.targetRoles,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return toFrontendNotification(created);
  }
}
