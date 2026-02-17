import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const email = "knphi.e-learning@gmail.com";
    console.log(`Updating user: ${email} to allow learner view switching...`);

    const user = await prisma.user.update({
        where: { email },
        data: { canSwitchToLearnerView: true },
    });

    console.log("✅ Updated user:", {
        email: user.email,
        role: user.role,
        canSwitchToLearnerView: user.canSwitchToLearnerView
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
