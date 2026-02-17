
import { PrismaClient } from "@prisma/client";
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const adminEmail = "knphi.e-learning@gmail.com";

    console.log(`Clearing all users EXCEPT admin: ${adminEmail}`);

    try {
        const deleted = await prisma.user.deleteMany({
            where: {
                email: {
                    not: adminEmail.toLowerCase(),
                },
            },
        });

        console.log(`Deleted ${deleted.count} users.`);

        const remaining = await prisma.user.findMany({
            select: { email: true, role: true }
        });

        console.log("Remaining users:", remaining);

    } catch (error) {
        console.error("Error clearing users:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
