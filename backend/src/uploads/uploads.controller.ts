import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { basename, extname, join } from "path";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { Request } from "express";
import { existsSync } from "fs";
import { writeFile, unlink } from "fs/promises";
import * as mammoth from "mammoth";
import { CloudinaryService } from "./cloudinary.service";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { memoryStorage } from "multer";

// Maximum file size: 500 MB
const MAX_SIZE = 500 * 1024 * 1024;

@ApiTags("uploads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("uploads")
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) { }

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      console.warn("UploadsController: No file received in request");
      throw new BadRequestException("No file uploaded");
    }

    console.log(
      `UploadsController: Received file "${file.originalname}" (${file.size} bytes, ${file.mimetype})`,
    );

    try {
      const result = await this.cloudinary.uploadFile(file);

      console.log("UploadsController: Upload successful", result.secure_url);

      return {
        filename: result.public_id,
        mimetype: file.mimetype,
        size: file.size,
        url: result.secure_url,
      };
    } catch (err: any) {
      console.error("UploadsController: Cloudinary upload error:", err);
      throw new BadRequestException(
        "File upload failed: " + (err.message || "Unknown error"),
      );
    }
  }

  @Post("word-to-slides")
  async convertWordToSlides(
    @Body() body: { fileUrl: string },
    @Req() req: Request,
  ) {
    if (!body?.fileUrl) {
      throw new BadRequestException("fileUrl is required");
    }

    // Download file to temp
    const tempPath = join(tmpdir(), `${randomUUID()}.docx`);
    try {
      const response = await fetch(body.fileUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const buffer = await response.arrayBuffer();
      await writeFile(tempPath, Buffer.from(buffer));

      const ext = extname(body.fileUrl).toLowerCase() || ".docx";

      let rawText = "";
      if (ext.includes("doc")) {
        const result = await mammoth.extractRawText({ path: tempPath });
        rawText = result.value || "";
      } else {
        rawText = "Could not extract text from this file type.";
      }

      // Generate HTML
      const parts = rawText
        .split(/\n\s*\n/g)
        .map((s) => s.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const slides = (parts.length ? parts : ["Slides generated."]).slice(
        0,
        20,
      );
      const title = basename(body.fileUrl, ext);

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - Slides</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #0b1020; color: #fff; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .slide { width: min(960px, 100%); min-height: 520px; background: linear-gradient(135deg, #1e3a8a, #065f46); border-radius: 16px; padding: 40px; box-sizing: border-box; display: none; }
    .slide.active { display: block; }
    .title { font-size: 32px; margin-bottom: 20px; }
    .content { font-size: 22px; line-height: 1.5; white-space: pre-wrap; }
    .controls { position: fixed; bottom: 20px; left: 0; right: 0; display: flex; justify-content: center; gap: 12px; }
    button { border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="wrap">
    ${slides
          .map(
            (text, idx) => `<section class="slide ${idx === 0 ? "active" : ""}">
      <div class="title">${idx === 0 ? title : `Slide ${idx + 1}`}</div>
      <div class="content">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </section>`,
          )
          .join("")}
  </div>
  <div class="controls">
    <button onclick="prev()">Previous</button>
    <button onclick="next()">Next</button>
  </div>
  <script>
    const slides = Array.from(document.querySelectorAll('.slide'));
    let i = 0;
    function render() { slides.forEach((s, idx) => s.classList.toggle('active', idx === i)); }
    function next() { i = (i + 1) % slides.length; render(); }
    function prev() { i = (i - 1 + slides.length) % slides.length; render(); }
    window.next = next; window.prev = prev;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });
  </script>
</body>
</html>`;

      // Upload HTML to Cloudinary as raw file
      const htmlBuffer = Buffer.from(html);
      const uploadResult = await this.cloudinary.uploadFile({
        buffer: htmlBuffer,
        originalname: `${title}-slides.html`,
        mimetype: "text/html",
      } as any);

      return {
        slidesUrl: uploadResult.secure_url,
        slideCount: slides.length,
      };
    } catch (e) {
      console.error(e);
      throw new BadRequestException("Failed to convert file");
    } finally {
      if (existsSync(tempPath)) await unlink(tempPath);
    }
  }
}
