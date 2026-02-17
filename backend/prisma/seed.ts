import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'free',
    displayName: 'Free',
    price: 0,
    sortOrder: 0,
    limits: {
      maxCompanies: 3,
      maxContractors: 10,
      maxDocuments: 50,
      maxSignaturesPerCompany: 1,
      maxStampsPerCompany: 1,
    },
  },
  {
    name: 'starter',
    displayName: 'Starter',
    price: 9,
    sortOrder: 1,
    limits: {
      maxCompanies: 10,
      maxContractors: 50,
      maxDocuments: 500,
      maxSignaturesPerCompany: 5,
      maxStampsPerCompany: 5,
    },
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 19,
    sortOrder: 2,
    limits: {
      maxCompanies: 25,
      maxContractors: -1,
      maxDocuments: -1,
      maxSignaturesPerCompany: 10,
      maxStampsPerCompany: 10,
    },
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 49,
    sortOrder: 3,
    limits: {
      maxCompanies: -1,
      maxContractors: -1,
      maxDocuments: -1,
      maxSignaturesPerCompany: -1,
      maxStampsPerCompany: -1,
    },
  },
];

async function main() {
  console.log('Seeding subscription plans...');

  // Upsert plans
  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        displayName: plan.displayName,
        price: plan.price,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
    console.log(`  ✓ Plan: ${plan.displayName}`);
  }

  // Get free plan
  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { name: 'free' },
  });

  if (!freePlan) {
    throw new Error('Free plan not found after seeding');
  }

  // Assign free plan to users without a subscription
  const usersWithoutSub = await prisma.user.findMany({
    where: { subscription: null },
    select: { id: true },
  });

  if (usersWithoutSub.length > 0) {
    console.log(`Assigning free plan to ${usersWithoutSub.length} user(s)...`);
    for (const user of usersWithoutSub) {
      await prisma.userSubscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: 'ACTIVE',
        },
      });
    }
    console.log('  ✓ All users assigned to free plan');
  }

  // Create admin user from ADMIN_EMAIL env var if provided
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (adminUser) {
      await prisma.adminUser.upsert({
        where: { userId: adminUser.id },
        update: {},
        create: { userId: adminUser.id },
      });
      console.log(`  ✓ Admin: ${adminEmail}`);
    } else {
      console.log(`  ⚠ Admin email ${adminEmail} not found in users table`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
