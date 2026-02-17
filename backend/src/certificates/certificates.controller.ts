import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CertificatesService } from "./certificates.service";

@ApiTags("certificates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.certificatesService.getById(id);
  }
}
