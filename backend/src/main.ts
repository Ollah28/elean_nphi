import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from "@nestjs/common";
// Restart trigger 2
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./shared/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = Number(config.get("PORT", 3001));
  const uploadsDir = join(process.cwd(), "uploads");
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  app.use(helmet());
  app.useStaticAssets(uploadsDir, { prefix: "/uploads/" });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const configService = app.get(ConfigService);
  console.log(`Main.ts: DATABASE_URL is ${configService.get("DATABASE_URL") ? 'SET' : 'NOT SET'}`);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("NPHI eLearning API")
    .setDescription("Backend API for NPHI eLearning")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const server = await app.listen(port);
  // 10-minute timeout for large file uploads
  server.setTimeout(600_000);
}

void bootstrap();
