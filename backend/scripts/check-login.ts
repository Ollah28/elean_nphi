import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function checkLogin() {
    const email = "knphi.e-learning@gmail.com";
    const password = "khsc#site";

    console.log(`Checking login for: ${email}`);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.error("❌ User not found in database!");
        return;
    }

    console.log("✅ User found:", {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPasswordHash: !!user.passwordHash
    });

    if (!user.passwordHash) {
        console.error("❌ User has no password hash!");
        return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (isMatch) {
        console.log("✅ Password match successful!");
    } else {
        console.error("❌ Password match failed!");
        console.log("Input password:", password);
        console.log("Stored hash:", user.passwordHash);

        // Test if we can generate a matching hash
        const newHash = await bcrypt.hash(password, 10);
        console.log("New generated hash would be:", newHash);
    }
}

checkLogin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
