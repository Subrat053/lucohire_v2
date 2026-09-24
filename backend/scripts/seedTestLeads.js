/**
 * Script: seedTestLeads.js
 * Purpose: Seed realistic test leads attached to a provider for testing the dynamic Leads section.
 * Usage:
 *   node scripts/seedTestLeads.js
 *   node scripts/seedTestLeads.js --email=provider@example.com
 *   node scripts/seedTestLeads.js --clean
 */
require('dotenv').config();
const prisma = require('../config/prisma');

async function main() {
  const args = process.argv.slice(2);
  const cleanOnly = args.includes('--clean');
  const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1];

  console.log('--- Seed Test Leads for Freelancer Dashboard ---');

  if (cleanOnly) {
    const deleted = await prisma.lead.deleteMany({
      where: {
        message: { contains: '[TEST_LEAD]' },
      },
    });
    console.log(`Cleaned up ${deleted.count} test leads.`);
    process.exit(0);
  }

  // 1. Locate Target Provider User
  let providerUser;
  if (emailArg) {
    providerUser = await prisma.user.findUnique({ where: { email: emailArg } });
  } else {
    // Find provider profile or user with role provider
    const profile = await prisma.providerProfile.findFirst({
      include: { userRecord: true },
    });
    if (profile?.userRecord) {
      providerUser = profile.userRecord;
    } else {
      providerUser = await prisma.user.findFirst({
        where: { role: 'provider' },
      });
    }
  }

  if (!providerUser) {
    console.error('No provider user found in PostgreSQL. Please register a provider first.');
    process.exit(1);
  }

  console.log(`Using Provider: ${providerUser.name} (${providerUser.email}, ID: ${providerUser.id})`);

  // 2. Locate or Create a Test Recruiter
  let recruiter = await prisma.user.findFirst({
    where: { role: 'recruiter' },
  });

  if (!recruiter) {
    recruiter = await prisma.user.create({
      data: {
        name: 'TechCorp Talent',
        email: 'recruiter.talent@techcorp.example',
        phone: '919876543210',
        role: 'recruiter',
        password: 'dummyPasswordHash123',
        company: 'TechCorp Solutions',
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });
    console.log(`Created dummy Recruiter: ${recruiter.name} (${recruiter.email})`);
  } else {
    console.log(`Using Recruiter: ${recruiter.name} (${recruiter.email})`);
  }

  // 3. Create or Locate a Test Job Post
  let jobPost = await prisma.jobPost.findFirst({
    where: { recruiter: recruiter.id },
  });

  if (!jobPost) {
    jobPost = await prisma.jobPost.create({
      data: {
        title: 'Full-Stack Web App & Dashboard Redesign',
        description: 'Looking for a dedicated freelancer to overhaul our customer dashboard and build clean, responsive components.',
        skill: 'React / Full-Stack',
        companyName: recruiter.company || 'TechCorp Solutions',
        city: 'Bengaluru',
        recruiter: recruiter.id,
        budgetMin: 18000,
        budgetMax: 25000,
        currency: 'INR',
        status: 'active',
      },
    });
    console.log(`Created sample JobPost: ${jobPost.title}`);
  }

  // 4. Create 2 Realistic Test Leads
  // Clean existing test leads for this provider
  await prisma.lead.deleteMany({
    where: {
      provider: providerUser.id,
      message: { contains: '[TEST_LEAD]' },
    },
  });

  // Lead 1: Brand new high-priority inquiry
  const lead1 = await prisma.lead.create({
    data: {
      provider: providerUser.id,
      recruiter: recruiter.id,
      jobPost: jobPost.id,
      type: 'direct_inquiry',
      status: 'new',
      message: '[TEST_LEAD] We reviewed your portfolio and would like to invite you to discuss our upcoming product release.',
      sourceType: 'recruiter_search',
      isUnlocked: true,
      tags: ['React', 'UI/UX', 'Dashboard'],
      priorityScore: 92,
      notes: {
        projectBrief: 'Complete overhaul of analytics interface with dark mode and export capabilities.',
        targetDelivery: '10 days',
        budgetOffered: 18000,
      },
    },
  });

  // Lead 2: A direct recruiter profile inquiry where a quote has already been sent
  const lead2 = await prisma.lead.create({
    data: {
      provider: providerUser.id,
      recruiter: recruiter.id,
      jobPost: null,
      type: 'contact_unlock',
      status: 'replied',
      message: '[TEST_LEAD] Urgent requirement for frontend component architecture review and testing.',
      sourceType: 'profile_view',
      isUnlocked: true,
      tags: ['Frontend', 'Node.js'],
      priorityScore: 88,
      notes: {
        projectBrief: 'Component audit and styling consistency fixes across 12 views.',
        quotedPrice: '12000',
        quotedTimeline: '5 days',
        freelancerNote: 'I can start immediately and deliver high-coverage unit tests alongside.',
        sentAt: new Date(Date.now() - 3600000).toISOString(),
      },
    },
  });

  console.log(`Successfully created 2 test leads:`);
  console.log(`1. Lead ID ${lead1.id} (status: new)`);
  console.log(`2. Lead ID ${lead2.id} (status: replied)`);
  console.log('You can now refresh the Freelancer Dashboard Leads tab to see dynamic real leads!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
