import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Safety first: do NOT wipe production-like data unless explicitly requested.
  const shouldReset =
    (process.env.SEED_RESET_ALL || "").toLowerCase() === "true" ||
    process.env.SEED_RESET_ALL === "1";

  if (shouldReset) {
    await prisma.notification.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.module.deleteMany();
    await prisma.course.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
  }

  // Keep exactly one bootstrap manager account.
  const managerEmail = (process.env.MANAGER_EMAIL || "knphi.e-learning@gmail.com").toLowerCase();
  const managerPassword = process.env.MANAGER_PASSWORD || "khsc#site";
  const managerName = process.env.MANAGER_NAME || "System Manager";
  const managerDepartment = process.env.MANAGER_DEPARTMENT || "Administration";

  await prisma.user.upsert({
    where: { email: managerEmail },
    update: {
      name: managerName,
      role: "manager",
      department: managerDepartment,
      passwordHash: await bcrypt.hash(managerPassword, 10),
    },
    create: {
      name: managerName,
      email: managerEmail,
      role: "manager",
      department: managerDepartment,
      passwordHash: await bcrypt.hash(managerPassword, 10),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
