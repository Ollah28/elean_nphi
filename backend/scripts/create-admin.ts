import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    const email = "knphi.e-learning@gmail.com";
    const password = "khsc#site";

    console.log(`Creating admin user: ${email}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash: hashedPassword,
            role: "manager",
        },
        create: {
            email,
            name: "System Manager",
            role: "manager",
            department: "Administration",
            passwordHash: hashedPassword,
        },
    });

    console.log("User created/updated:", user);
}

main()
    .catch((e) => {
        const fs = require('fs');
        const errorLog = {
            message: e.message,
            stack: e.stack,
            ...e
        };
        fs.writeFileSync('error.log', JSON.stringify(errorLog, null, 2));
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
