import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'billabiola18@gmail.com';
    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            progressRecords: false,
        }
    });

    if (!user) {
        console.log('❌ User NOT FOUND in the database.');
    } else {
        console.log('✅ User FOUND:');
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Email Verified: ${user.isEmailVerified}`);
        console.log(`Has Password Hash: ${user.passwordHash ? 'YES' : 'NO (Google Auth?)'}`); // Simplified check
        console.log(`Google ID: ${user.googleId || 'None'}`);
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
