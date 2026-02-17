import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { toFrontendCertificate } from "../shared/mappers";

@Injectable()
export class CertificatesService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new NotFoundException("Certificate not found");
    return toFrontendCertificate(cert);
  }
}
