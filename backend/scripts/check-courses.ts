import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Checking all courses in DB...");
    const courses = await prisma.course.findMany({
        include: {
            assignedManager: { select: { email: true } },
        }
    });

    console.log(`Found ${courses.length} courses total.`);

    if (courses.length === 0) {
        console.log("No courses found!");
        return;
    }

    console.log("\n--- Course List ---");
    courses.forEach(c => {
        console.log(`ID: ${c.id}`);
        console.log(`Title: ${c.title}`);
        console.log(`Status: ${c.status}`);
        console.log(`Instructor: ${c.instructor}`);
        console.log(`Assigned Manager: ${c.assignedManager?.email}`);
        console.log(`Category: ${c.category}`);
        console.log("-------------------");
    });

    console.log("\nChecking 'Public' visibility (no filters)...");
    const publicCourses = await prisma.course.findMany({});
    console.log(`Public query found ${publicCourses.length} courses.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
