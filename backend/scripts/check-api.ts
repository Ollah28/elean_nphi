import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching courses from API (simulated via DB matching)...");
    // I can't easily curl from here because I don't want to depend on curl.
    // Actually I can just use fetch since I'm in node 18/20.

    try {
        const response = await fetch("http://localhost:3001/courses?limit=50");
        const json = await response.json();
        console.log("API Status:", response.status);
        console.log("API Data Count:", json.data?.length);
        if (json.data?.length > 0) {
            console.log("First Course:", json.data[0]);
        } else {
            console.log("API returned NO courses.");
        }
    } catch (e) {
        console.error("Failed to fetch from API:", e.message);
    }
}

main();
