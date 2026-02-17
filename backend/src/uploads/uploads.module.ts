import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UploadsController } from "./uploads.controller";
import { CloudinaryProvider } from "./cloudinary.provider";
import { CloudinaryService } from "./cloudinary.service";

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadsModule { }
