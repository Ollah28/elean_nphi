import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'willie.njoroge97@gmail.com';

    console.log(`Deleting ALL users except: ${adminEmail}...`);

    const result = await prisma.user.deleteMany({
        where: {
            email: {
                not: adminEmail
            }
        }
    });

    console.log(`✅ Deleted ${result.count} users.`);

    const remaining = await prisma.user.findMany({ select: { email: true, role: true } });
    console.log('Remaining users:', remaining);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
