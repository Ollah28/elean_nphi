import { Injectable } from "@nestjs/common";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import * as streamifier from "streamifier";

@Injectable()
export class CloudinaryService {
    async uploadFile(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            // Determine resource_type based on mimetype
            let resourceType: "image" | "video" | "raw" = "auto" as any;
            if (file.mimetype.startsWith("image/")) {
                resourceType = "image";
            } else if (file.mimetype.startsWith("video/")) {
                resourceType = "video";
            } else {
                resourceType = "raw";
            }

            console.log(`CloudinaryService: Uploading ${file.originalname} (${file.mimetype}) as ${resourceType}`);

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "health_elearn_uploads",
                    resource_type: resourceType,
                    timeout: 300000, // 5 minutes
                },
                (error, result) => {
                    if (error) {
                        console.error("CloudinaryService: Upload error:", error);
                        return reject(error);
                    }
                    console.log("CloudinaryService: Upload success:", result?.secure_url);
                    resolve(result!);
                },
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }
}
