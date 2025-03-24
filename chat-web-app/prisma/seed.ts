import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const testUser = await prisma.user.upsert({
        where: { id: 'test-user-1' },
        update: {},
        create: {
            id: 'test-user-1',
            email: 'test-user@example.com',
            name: 'Test User',
            role: 'PROVIDER',
        },
    });

    console.log(`Created or updated default test user: ${testUser.id}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
