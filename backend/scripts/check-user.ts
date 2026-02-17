import { PrismaClient } from "@prisma/client";
import * as dotenv from 'dotenv';
dotenv.config();


const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || "ollahtrading254@gmail.com";
    console.log(`Checking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            progressRecords: true,
            managedCourses: true,
        }
    });

    if (user) {
        console.log("User found:");
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log("User not found.");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
