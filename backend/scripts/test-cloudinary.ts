import { v2 as cloudinary } from "cloudinary";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkCloudinary() {
    console.log("Checking Cloudinary Configuration...");
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        console.error("❌ Missing Cloudinary credentials in .env");
        console.log("Cloud Name:", cloudName);
        console.log("API Key:", apiKey ? "***" : "MISSING");
        console.log("API Secret:", apiSecret ? "***" : "MISSING");
        return;
    }

    console.log("✅ Credentials found.");
    console.log(`Cloud Name: ${cloudName}`);

    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    });

    console.log("Attempting to upload a test string as a file...");

    try {
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "test_uploads", resource_type: "raw" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            const buffer = Buffer.from("Hello Cloudinary! This is a test upload.");
            uploadStream.end(buffer);
        });

        console.log("✅ Upload successful!");
        console.log("Result:", result);
    } catch (error) {
        console.error("❌ Upload failed:", error);
    }
}

checkCloudinary();
