import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'willie.njoroge97@gmail.com';
    console.log(`Promoting ${email} to admin...`);

    await prisma.user.update({
        where: { email },
        data: { role: 'admin' }
    });

    console.log(`✅ Promoted ${email} to ADMIN.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
