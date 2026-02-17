
import { PrismaClient } from "@prisma/client";
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                role: true,
                name: true,
                isEmailVerified: true,
                googleId: true
            }
        });

        console.log("Current Users in DB:");
        console.log(JSON.stringify(users, null, 2));

    } catch (error) {
        console.error("Error listing users:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
