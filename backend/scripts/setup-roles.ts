
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const adminEmail = "knphi.e-learning@gmail.com";
    const managerEmail = "manager@nphi.local";

    console.log("Setting up roles...");

    // 1. Promote Admin
    try {
        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: { role: Role.admin },
            create: {
                email: adminEmail,
                name: "System Admin",
                role: Role.admin,
                passwordHash: await bcrypt.hash("khsc#site", 10),
                department: "Administration",
                isEmailVerified: true
            }
        });
        console.log(`Admin configured: ${admin.email} (${admin.role})`);
    } catch (e) {
        console.error("Error setting up admin:", e);
    }

    // 2. Create/Update Manager
    try {
        const manager = await prisma.user.upsert({
            where: { email: managerEmail },
            update: { role: Role.manager },
            create: {
                email: managerEmail,
                name: "Course Tutor",
                role: Role.manager,
                passwordHash: await bcrypt.hash("manager123", 10),
                department: "Training",
                isEmailVerified: true
            }
        });
        console.log(`Manager configured: ${manager.email} (${manager.role})`);
    } catch (e) {
        console.error("Error setting up manager:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
