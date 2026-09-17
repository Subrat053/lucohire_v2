require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

const FREELANCERS = [
  {
    email: 'ananya.verma@lucohire.test',
    name: 'Ananya Verma',
    cityName: 'Pune',
    profilePhoto: 'https://randomuser.me/api/portraits/women/68.jpg',
    designation: 'SaaS Content Writer',
    category: 'content',
    locationText: '📍 Pune · 🌐 Remote',
    rating: 4.9,
    totalReviews: 120,
    experience: '3',
    responseRate: '100%',
    canStart: 'Today',
    skills: ['SaaS Copy', 'SEO Writing', 'Notion', 'B2B Copywriting'],
    pricing: '4',
    pricingType: '/word',
    availableSlots: '3 slots',
    slotPeriod: 'This month',
    boostWeight: 10,
    description: 'Specialized B2B SaaS copywriter and SEO strategist helping software startups convert visitors into paying users.',
  },
  {
    email: 'rohit.malhotra@lucohire.test',
    name: 'Rohit Malhotra',
    cityName: 'Lucknow',
    profilePhoto: 'https://randomuser.me/api/portraits/men/52.jpg',
    designation: 'Voice-over & Audio Editor',
    category: 'video',
    locationText: '📍 Lucknow · 🌐 Remote',
    rating: 4.8,
    totalReviews: 80,
    experience: '5',
    responseRate: '95%',
    canStart: 'Tomorrow',
    skills: ['Voice-over', 'Audio Editing', 'Hindi + English', 'Podcast Production'],
    pricing: '2500',
    pricingType: '/project',
    availableSlots: '5 slots',
    slotPeriod: 'This month',
    boostWeight: 0,
    description: 'Pro voice talent and audio engineer for commercial podcasts, brand ads, and instructional content.',
  },
  {
    email: 'meher.kaur@lucohire.test',
    name: 'Meher Kaur',
    cityName: 'Delhi',
    profilePhoto: 'https://randomuser.me/api/portraits/women/54.jpg',
    designation: 'Logo & Brand Designer',
    category: 'design',
    locationText: '📍 Delhi · 🌐 Remote',
    rating: 5.0,
    totalReviews: 150,
    experience: '4',
    responseRate: '98%',
    canStart: 'Today',
    skills: ['Figma', 'Branding', 'Illustration', 'UI Systems'],
    pricing: '3000',
    pricingType: '/logo',
    availableSlots: '2 slots',
    slotPeriod: 'This month',
    boostWeight: 0,
    description: 'Identity designer with 150+ brand kits completed for fast-growing Indian D2C and tech companies.',
  },
  {
    email: 'arvind.sharma@lucohire.test',
    name: 'Arvind Sharma',
    cityName: 'Bengaluru',
    profilePhoto: 'https://randomuser.me/api/portraits/men/32.jpg',
    designation: 'React & Next.js Developer',
    category: 'dev',
    locationText: '📍 Bengaluru · 🌐 Remote',
    rating: 4.9,
    totalReviews: 95,
    experience: '4',
    responseRate: '97%',
    canStart: 'Today',
    skills: ['React', 'Next.js', 'TypeScript', 'TailwindCSS'],
    pricing: '1200',
    pricingType: '/hr',
    availableSlots: '4 slots',
    slotPeriod: 'This month',
    boostWeight: 8,
    description: 'Senior frontend architect crafting pixel-perfect web experiences, design systems, and fast SaaS web apps.',
  },
  {
    email: 'sneha.patel@lucohire.test',
    name: 'Sneha Patel',
    cityName: 'Mumbai',
    profilePhoto: 'https://randomuser.me/api/portraits/women/33.jpg',
    designation: 'Growth & Performance Marketer',
    category: 'marketing',
    locationText: '📍 Mumbai · 🌐 Remote',
    rating: 4.9,
    totalReviews: 110,
    experience: '5',
    responseRate: '100%',
    canStart: 'This Week',
    skills: ['Meta Ads', 'Google Ads', 'Funnel Optimization', 'Analytics'],
    pricing: '15000',
    pricingType: '/month',
    availableSlots: '2 slots',
    slotPeriod: 'This month',
    boostWeight: 0,
    description: 'Performance marketing specialist managing 50L+ monthly ad spend with focus on ROAS and scalable acquisition.',
  },
  {
    email: 'vikram.joshi@lucohire.test',
    name: 'Vikram Joshi',
    cityName: 'Hyderabad',
    profilePhoto: 'https://randomuser.me/api/portraits/men/44.jpg',
    designation: 'Full-stack AI Developer',
    category: 'dev',
    locationText: '📍 Hyderabad · 🌐 Remote',
    rating: 4.95,
    totalReviews: 78,
    experience: '6',
    responseRate: '99%',
    canStart: 'Today',
    skills: ['Python', 'FastAPI', 'OpenAI', 'Next.js'],
    pricing: '1800',
    pricingType: '/hr',
    availableSlots: '3 slots',
    slotPeriod: 'This month',
    boostWeight: 9,
    description: 'Full-stack AI engineer building agentic workflows, LLM integrations, and robust web backends.',
  },
];

async function seedFreelancers() {
  console.log('🌱 Starting freelancer profiles seeding into PostgreSQL...');
  const defaultHashedPassword = await bcrypt.hash('Freelancer@123', 10);

  let seededCount = 0;

  for (const item of FREELANCERS) {
    try {
      // 1. Upsert User record
      const user = await prisma.user.upsert({
        where: { email: item.email },
        update: {
          name: item.name,
          cityName: item.cityName,
          profilePhoto: item.profilePhoto,
          role: 'provider',
          activeRole: 'provider',
          roleIntent: 'provider',
          roles: ['provider', 'freelancer'],
          approvalStatus: 'approved',
          isVerified: true,
          isEmailVerified: true,
          isPublicProfile: true,
          status: 'active',
        },
        create: {
          email: item.email,
          name: item.name,
          cityName: item.cityName,
          profilePhoto: item.profilePhoto,
          password: defaultHashedPassword,
          hasPassword: true,
          authProvider: 'email',
          role: 'provider',
          activeRole: 'provider',
          roleIntent: 'provider',
          roles: ['provider', 'freelancer'],
          approvalStatus: 'approved',
          isVerified: true,
          isEmailVerified: true,
          isPublicProfile: true,
          status: 'active',
        },
      });

      // 2. Upsert ProviderProfile record linked via user.id
      await prisma.providerProfile.upsert({
        where: { user: user.id },
        update: {
          category: item.category,
          designation: item.designation,
          city: item.cityName,
          skills: item.skills,
          pricing: item.pricing,
          pricingType: item.pricingType,
          experience: item.experience,
          rating: item.rating,
          totalReviews: item.totalReviews,
          boostWeight: item.boostWeight,
          isApproved: true,
          isPublicProfile: true,
          isVerified: true,
          visibility: 'public',
          profileStatus: 'published',
          profilePhoto: item.profilePhoto,
          description: item.description,
          roles: ['provider', 'freelancer'],
          locationData: {
            city: item.cityName,
            country: 'India',
            formatted: item.locationText,
          },
        },
        create: {
          user: user.id,
          category: item.category,
          designation: item.designation,
          city: item.cityName,
          skills: item.skills,
          pricing: item.pricing,
          pricingType: item.pricingType,
          experience: item.experience,
          rating: item.rating,
          totalReviews: item.totalReviews,
          boostWeight: item.boostWeight,
          isApproved: true,
          isPublicProfile: true,
          isVerified: true,
          visibility: 'public',
          profileStatus: 'published',
          profilePhoto: item.profilePhoto,
          description: item.description,
          roles: ['provider', 'freelancer'],
          locationData: {
            city: item.cityName,
            country: 'India',
            formatted: item.locationText,
          },
        },
      });

      seededCount++;
      console.log(`✅ Seeded provider: ${item.name} (${item.designation} - ${item.cityName})`);
    } catch (err) {
      console.error(`❌ Failed to seed ${item.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Completed! Successfully seeded ${seededCount}/${FREELANCERS.length} freelancer profiles.`);
  await prisma.$disconnect();
}

seedFreelancers().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
