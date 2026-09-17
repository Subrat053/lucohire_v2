require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

async function seedUser() {
  const email = 'douknowme100@gmail.com';
  const passwordPlain = 'Password@123';
  const hashedPassword = await bcrypt.hash(passwordPlain, 10);

  console.log(`🌱 Seeding user: ${email}...`);

  // 1. Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Dou Know Me',
      role: 'provider',
      activeRole: 'provider',
      roleIntent: 'provider',
      roles: ['provider', 'candidate'],
      approvalStatus: 'approved',
      isVerified: true,
      isEmailVerified: true,
      isPublicProfile: true,
      hasPassword: true,
      password: hashedPassword,
      status: 'active',
    },
    create: {
      email,
      name: 'Dou Know Me',
      password: hashedPassword,
      hasPassword: true,
      authProvider: 'email',
      role: 'provider',
      activeRole: 'provider',
      roleIntent: 'provider',
      roles: ['provider', 'candidate'],
      approvalStatus: 'approved',
      isVerified: true,
      isEmailVerified: true,
      isPublicProfile: true,
      status: 'active',
      cityName: 'Bengaluru',
      country: 'India',
      profilePhoto: 'https://ui-avatars.com/api/?name=Dou+Know+Me&background=4A3AE0&color=fff',
    },
  });

  // 2. Upsert ProviderProfile
  const profile = await prisma.providerProfile.upsert({
    where: { user: user.id },
    update: {
      designation: 'Full Stack Engineer & Consultant',
      category: 'dev',
      city: 'Bengaluru',
      skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'AI Integration'],
      experience: '5',
      pricing: '1500',
      pricingType: '/hr',
      rating: 5.0,
      totalReviews: 25,
      isApproved: true,
      isPublicProfile: true,
      isVerified: true,
      visibility: 'public',
      profileStatus: 'published',
      description: 'Experienced full stack developer building scalable web applications, robust backends, and AI pipelines.',
      roles: ['provider', 'freelancer'],
    },
    create: {
      user: user.id,
      designation: 'Full Stack Engineer & Consultant',
      category: 'dev',
      city: 'Bengaluru',
      skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'AI Integration'],
      experience: '5',
      pricing: '1500',
      pricingType: '/hr',
      rating: 5.0,
      totalReviews: 25,
      isApproved: true,
      isPublicProfile: true,
      isVerified: true,
      visibility: 'public',
      profileStatus: 'published',
      profilePhoto: 'https://ui-avatars.com/api/?name=Dou+Know+Me&background=4A3AE0&color=fff',
      description: 'Experienced full stack developer building scalable web applications, robust backends, and AI pipelines.',
      roles: ['provider', 'freelancer'],
    },
  });

  console.log('\n✅ User seeded successfully!');
  console.log('-------------------------------------------');
  console.log(`User ID          : ${user.id}`);
  console.log(`Email            : ${user.email}`);
  console.log(`Password         : ${passwordPlain}`);
  console.log(`Role             : ${user.role} (activeRole: ${user.activeRole})`);
  console.log(`Approval Status  : ${user.approvalStatus}`);
  console.log(`Provider Profile : ${profile.id} (${profile.designation})`);
  console.log('-------------------------------------------');

  await prisma.$disconnect();
}

seedUser().catch(err => {
  console.error('❌ Error seeding user:', err);
  process.exit(1);
});
