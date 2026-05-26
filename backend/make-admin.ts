import { prisma } from './src/db/prisma';
declare var process: any;

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Please provide an email address. Example: npx ts-node make-admin.ts user@example.com');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log(`Success! ${user.email} is now an ADMIN.`);
  } catch (error) {
    console.error('Error making user admin. Ensure the email is correct and exists in the database.');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
