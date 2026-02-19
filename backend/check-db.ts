
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing DB connection...');
    await prisma.$connect();
    console.log('✅ Connected successfully!');
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
}

main()
    .catch(e => {
        console.error('❌ Connection failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
