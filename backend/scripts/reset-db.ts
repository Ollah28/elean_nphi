
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load env vars explicitly if running as a script
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Deleting ALL users...');
    try {
        await prisma.user.deleteMany({});
        console.log('✅ All users deleted.');
    } catch (e) {
        console.error('Error deleting users:', e);
    }

    console.log('👤 Creating Admin Account...');

    // Admin Details
    const adminEmail = 'billabiola18@gmail.com';
    const adminPassword = 'Prodigy18'; // Use a strong password or the one from the screenshot/context if available. 
    // The user used 'Prodigy18' in the screenshot. I will use that.

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    try {
        const admin = await prisma.user.create({
            data: {
                name: 'System Admin',
                email: adminEmail,
                passwordHash: hashedPassword,
                role: Role.admin, // Ensure Role enum is available or use string 'admin'
                department: 'IT',
                isEmailVerified: true,
                emailVerificationToken: null,
            },
        });
        console.log('✅ Admin account created successfully!');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
    } catch (e) {
        console.error('Error creating admin:', e);
    }

    console.log('🎓 Creating Default Learner Account...');

    // Learner Details
    const learnerEmail = 'learner@demo.com';
    const learnerPassword = 'Learner123';

    const hashedLearnerPassword = await bcrypt.hash(learnerPassword, 10);

    try {
        await prisma.user.create({
            data: {
                name: 'Demo Learner',
                email: learnerEmail,
                passwordHash: hashedLearnerPassword,
                role: Role.learner,
                department: 'General',
                isEmailVerified: true,
                emailVerificationToken: null,
            },
        });
        console.log('✅ Learner account created successfully!');
        console.log(`📧 Email: ${learnerEmail}`);
        console.log(`🔑 Password: ${learnerPassword}`);
    } catch (e) {
        console.error('Error creating learner:', e);
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
